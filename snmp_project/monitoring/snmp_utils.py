import asyncio
import os

from pysnmp.hlapi.v3arch.asyncio import (
    CommunityData, ContextData, ObjectIdentity, ObjectType,
    SnmpEngine, UdpTransportTarget, walk_cmd,
)

from .models import Alert, Metric

# الـ OIDs المعيارية المحددة في المتطلبات
OID_CPU = '1.3.6.1.2.1.25.3.3.1.2'             # hrProcessorLoad (عمود في جدول - قيمة لكل معالج)
OID_INTERFACE_STATUS = '1.3.6.1.2.1.2.2.1.8'   # ifOperStatus (1=Up, 2=Down) - قيمة لكل واجهة

COMMUNITY = 'public'
SNMP_PORT = int(os.environ.get('SNMP_PORT', 161))
TIMEOUT = 2.0
RETRIES = 1
CPU_THRESHOLD = 75.0

IF_STATUS_UP = 1
IF_STATUS_DOWN = 2


class DeviceUnreachable(Exception):
    pass


async def _walk(engine, target, oid):
    """
    الـ OIDs المطلوبة أعمدة جداول وليست قيماً مفردة، لذلك نستخدم walk
    لجلب كل الصفوف (لكل معالج / لكل واجهة) بدلاً من get.
    يُرجع قائمة من (index, value).
    """
    rows = []
    async for error_indication, error_status, error_index, var_binds in walk_cmd(
        engine,
        CommunityData(COMMUNITY, mpModel=1),  # SNMP v2c
        target,
        ContextData(),
        ObjectType(ObjectIdentity(oid)),
        lexicographicMode=False,  # التوقف عند نهاية الشجرة الفرعية
    ):
        if error_indication:
            raise DeviceUnreachable(str(error_indication))
        if error_status:
            raise DeviceUnreachable(f"{error_status.prettyPrint()} at index {error_index}")
        for name, value in var_binds:
            rows.append((str(name).rsplit('.', 1)[-1], int(value)))
    return rows


async def _query_device(ip):
    engine = SnmpEngine()
    try:
        target = await UdpTransportTarget.create((ip, SNMP_PORT), timeout=TIMEOUT, retries=RETRIES)
        cpu_rows = await _walk(engine, target, OID_CPU)
        if_rows = await _walk(engine, target, OID_INTERFACE_STATUS)
    finally:
        engine.close_dispatcher()
    return cpu_rows, if_rows


def query_device(ip):
    """
    يجلب بيانات الجهاز عبر SNMP v2c ويُرجع dict بالنتيجة:
    {'success': True, 'cpu': float|None, 'down_interfaces': [...], 'interfaces_total': int}
    أو {'success': False, 'error': str}
    """
    try:
        cpu_rows, if_rows = asyncio.run(_query_device(ip))
    except DeviceUnreachable as e:
        return {'success': False, 'error': f"Timeout or network error: {e}"}
    except Exception as e:
        return {'success': False, 'error': f"Exception occurred: {e}"}

    if not cpu_rows and not if_rows:
        return {'success': False, 'error': 'No response data (check community string / MIB support)'}

    # متوسط حمل المعالجات في حال وجود أكثر من معالج
    cpu = round(sum(v for _, v in cpu_rows) / len(cpu_rows), 2) if cpu_rows else None
    return {
        'success': True,
        'cpu': cpu,
        'down_interfaces': [idx for idx, v in if_rows if v == IF_STATUS_DOWN],
        'interfaces_up': sum(1 for _, v in if_rows if v == IF_STATUS_UP),
        'interfaces_total': len(if_rows),
    }


def record_poll_result(device, result):
    """
    يحفظ نتيجة الاستطلاع في قاعدة البيانات ويفحص شروط التنبيه.
    منفصلة عن SNMP حتى يمكن استخدامها أيضاً في محاكاة السيناريوهات (simulate_scenario).
    """
    if not result['success']:
        handle_device_unreachable(device, result['error'])
        return Metric.objects.create(device=device, cpu_usage=None, interface_status='Unreachable')

    down = result['down_interfaces']
    metric = Metric.objects.create(
        device=device,
        cpu_usage=result['cpu'],
        interface_status='Down' if down else 'Up',
        interfaces_up=result['interfaces_up'],
        interfaces_total=result['interfaces_total'],
    )
    check_alert_conditions(device, result['cpu'], down)
    return metric


def poll_device_snmp(device):
    """استطلاع (Polling) جهاز واحد: جلب البيانات ثم تخزينها وفحص التنبيهات"""
    return record_poll_result(device, query_device(device.ip_address))


def create_alert(device, alert_type, msg):
    Alert.objects.create(device=device, alert_type=alert_type, alert_message=msg)
    print(f"[ALERT CONSOLE] {msg}", flush=True)


def check_alert_conditions(device, cpu_usage, down_interfaces):
    """فحص الشروط وتوليد التنبيهات إذا لزم الأمر"""

    # شرط ارتفاع المعالج > 75%
    if cpu_usage is not None and cpu_usage > CPU_THRESHOLD:
        create_alert(device, Alert.TYPE_CPU,
                     f"High CPU Usage Alert: {cpu_usage}% on device {device.ip_address}")

    # شرط تعطل واجهة الشبكة (Down)
    if down_interfaces:
        ifaces = ', '.join(down_interfaces)
        create_alert(device, Alert.TYPE_INTERFACE,
                     f"Interface Down Alert on device {device.ip_address} (ifIndex: {ifaces})")


def handle_device_unreachable(device, error_msg):
    """التعامل مع حالة انقطاع الاتصال بالجهاز (Device Unreachable)"""
    create_alert(device, Alert.TYPE_UNREACHABLE,
                 f"Device Unreachable Alert: {device.ip_address} - {error_msg}")
