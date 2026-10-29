from celery import shared_task
from .models import Device, Metric, Alert
from .snmp_utils import poll_device_snmp  # دالة جلب البيانات عبر SNMP التي أنشأناها سابقاً

@shared_task
def poll_all_devices_task():
    devices = Device.objects.all()
    for device in devices:
        # استدعاء دالة الـ SNMP لكل جهاز
        result = poll_device_snmp(device)
        
        if result['success']:
            # تخزين القياسات الناجحة
            Metric.objects.create(
                device=device,
                cpu_usage=result['cpu'],
                interface_status=result['status']
            )
        else:
            # تسجيل تنبيه في حال فشل الاتصال بالجهاز (Timeout / Unreachable)
            Alert.objects.create(
                device=device,
                alert_message=f"Failed to poll device: {result['error']}"
            )