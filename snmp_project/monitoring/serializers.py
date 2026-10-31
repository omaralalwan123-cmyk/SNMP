import ipaddress

from rest_framework import serializers
from .models import Device, Metric, Alert

class MetricSerializer(serializers.ModelSerializer):
    class Meta:
        model = Metric
        fields = ['id', 'timestamp', 'cpu_usage', 'interface_status', 'interfaces_up', 'interfaces_total']

class DeviceSerializer(serializers.ModelSerializer):
    # آخر قياس + عدد التنبيهات لعرض حالة الجهاز في الواجهة دون طلبات إضافية
    latest_metric = serializers.SerializerMethodField()
    alert_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Device
        fields = ['id', 'ip_address', 'latest_metric', 'alert_count']

    def get_latest_metric(self, obj):
        metric = obj.metrics.order_by('-timestamp').first()
        return MetricSerializer(metric).data if metric else None

    def validate_ip_address(self, value):
        try:
            return str(ipaddress.ip_address(value.strip()))
        except ValueError:
            raise serializers.ValidationError('Enter a valid IPv4 or IPv6 address.')

class AlertSerializer(serializers.ModelSerializer):
    device_ip = serializers.CharField(source='device.ip_address', read_only=True)

    class Meta:
        model = Alert
        fields = ['id', 'device', 'device_ip', 'alert_type', 'alert_message', 'timestamp']
