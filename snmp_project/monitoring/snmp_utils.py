from pysnmp.hlapi import *
from .models import Metric, Alert

# الـ OIDs المعيارية المحددة في المتطلبات
OID_CPU = '1.3.6.1.2.1.25.3.3.1.2'          # Host Resources CPU Load
OID_INTERFACE_STATUS = '1.3.6.1.2.2.1.8'    # Interface Operational Status (1=Up, 2=Down)

def poll_device_snmp(device):
    """
    تقوم هذه الدالة بعمل استطلاع (Polling) لجهاز شبكي عبر SNMP v2c
    وجلب بيانات المعالج وحالة الواجهة، مع فحص شروط التنبيهات.
    """
    ip = device.ip_address
    community = 'public'[cite: 1]

    cpu_usage = None
    interface_status_val = "Unknown"
    
    try:
        # 1. جلب مؤشر المعالج (CPU Usage)
        errorIndication, errorStatus, errorIndex, varBinds = next(
            getCmd(
                SnmpEngine(),
                CommunityData(community, mpModel=1),  # SNMP v2c
                UdpTransportTarget((ip, 161), timeout=2.0, retries=1),
                ContextData(),
                ObjectType(ObjectIdentity(OID_CPU))
            )
        )

        if errorIndication:
            # حالة تعذر الوصول للجهاز (Device Unreachable / Timeout)
            handle_device_unreachable(device, f"Timeout or Network Error: {errorIndication}")
            return
        elif errorStatus:
            print(f"SNMP Error on {ip}: {errorStatus.prettyPrint()}")
            return
        else:
            for varBind in varBinds:
                cpu_usage = float(varBind[1])

        # 2. جلب حالة واجهة الشبكة (Interface Status)
        errorIndication, errorStatus, errorIndex, varBinds = next(
            getCmd(
                SnmpEngine(),
                CommunityData(community, mpModel=1),
                UdpTransportTarget((ip, 161), timeout=2.0, retries=1),
                ContextData(),
                ObjectType(ObjectIdentity(OID_INTERFACE_STATUS))
            )
        )

        if not errorIndication and not errorStatus:
            for varBind in varBinds:
                status_code = int(varBind[1])
                # حسب معيار MIB-II: القيمة 1 تعني Up وقيمة 2 تعني Down
                interface_status_val = "Up" if status_code == 1 else "Down"

        # 3. حفظ القياسات في قاعدة البيانات
        Metric.objects.create(
            device=device,
            cpu_usage=cpu_usage if cpu_usage is not None else 0.0,
            interface_status=interface_status_val
        )

        # 4. التحقق من شروط التنبيه (Alert Conditions)
        check_alert_conditions(device, cpu_usage, interface_status_val)

    except Exception as e:
        handle_device_unreachable(device, f"Exception occurred: {str(e)}")

def check_alert_conditions(device, cpu_usage, interface_status):
    """فحص الشروط وتوليد التنبيهات إذا لزم الأمر"""
    
    # شرط ارتفاع المعالج > 75%
    if cpu_usage is not None and cpu_usage > 75.0:
        msg = f"High CPU Usage Alert: {cpu_usage}% on device {device.ip_address}"
        Alert.objects.create(device=device, alert_message=msg)
        print(f"[ALERT CONSOLE] {msg}")

    # شرط تعطل واجهة الشبكة (Down)
    if interface_status == "Down":
        msg = f"Interface Down Alert on device {device.ip_address}"
        Alert.objects.create(device=device, alert_message=msg)
        print(f"[ALERT CONSOLE] {msg}")

def handle_device_unreachable(device, error_msg):
    """التعامل مع حالة انقطاع الاتصال بالجهاز (Device Unreachable)[cite: 1]"""
    msg = f"Device Unreachable Alert: {device.ip_address} - {error_msg}"
    Alert.objects.create(device=device, alert_message=msg)
    print(f"[ALERT CONSOLE] {msg}")