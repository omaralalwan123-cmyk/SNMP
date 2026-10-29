from rest_framework import generics
from .models import Device, Metric, Alert
from .serializers import DeviceSerializer, MetricSerializer, AlertSerializer

# 1. جلب قائمة الأجهزة: GET /devices[cite: 1]
class DeviceListView(generics.ListCreateAPIView):
    queryset = Device.objects.all()
    serializer_class = DeviceSerializer

# 2. جلب قياسات جهاز معين: GET /devices/{id}/metrics[cite: 1]
class DeviceMetricsView(generics.ListAPIView):
    serializer_class = MetricSerializer

    def get_queryset(self):
        device_id = self.kwargs['pk']
        return Metric.objects.filter(device_id=device_id).order_by('-timestamp')

# 3. جلب التنبيهات: GET /alerts[cite: 1]
class AlertListView(generics.ListAPIView):
    queryset = Alert.objects.all().order_by('-timestamp')
    serializer_class = AlertSerializer