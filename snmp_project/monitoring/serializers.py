from rest_framework import serializers
from .models import Device, Metric, Alert

class MetricSerializer(serializers.ModelSerializer):
    class Meta:
        model = Metric
        fields = ['id', 'timestamp', 'cpu_usage', 'interface_status']

class DeviceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Device
        fields = ['id', 'ip_address']

class AlertSerializer(serializers.ModelSerializer):
    device_ip = serializers.CharField(source='device.ip_address', read_only=True)
    
    class Meta:
        model = Alert
        fields = ['id', 'device', 'device_ip', 'alert_message', 'timestamp']