from django.db.models import Count
from django.shortcuts import get_object_or_404
from rest_framework import generics
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Device, Metric, Alert
from .serializers import DeviceSerializer, MetricSerializer, AlertSerializer
from .snmp_utils import poll_device_snmp

DEFAULT_LIMIT = 100
MAX_LIMIT = 1500


def get_limit(request):
    try:
        return max(1, min(int(request.query_params.get('limit', DEFAULT_LIMIT)), MAX_LIMIT))
    except ValueError:
        return DEFAULT_LIMIT


def devices_queryset():
    return Device.objects.annotate(alert_count=Count('alerts')).order_by('id')

# 1. جلب قائمة الأجهزة: GET /devices  (وإضافة جهاز: POST /devices)
class DeviceListView(generics.ListCreateAPIView):
    queryset = devices_queryset()
    serializer_class = DeviceSerializer

# جهاز واحد: GET / DELETE /devices/{id}
class DeviceDetailView(generics.RetrieveDestroyAPIView):
    queryset = devices_queryset()
    serializer_class = DeviceSerializer

# 2. جلب قياسات جهاز معين: GET /devices/{id}/metrics?limit=N
class DeviceMetricsView(generics.ListAPIView):
    serializer_class = MetricSerializer

    def get_queryset(self):
        device = get_object_or_404(Device, pk=self.kwargs['pk'])
        return Metric.objects.filter(device=device).order_by('-timestamp')[:get_limit(self.request)]

# استطلاع فوري لجهاز: POST /devices/{id}/poll
class DevicePollView(APIView):
    def post(self, request, pk):
        device = get_object_or_404(Device, pk=pk)
        metric = poll_device_snmp(device)
        return Response(MetricSerializer(metric).data)

# 3. جلب التنبيهات: GET /alerts?device=ID&type=cpu|interface|unreachable&limit=N
class AlertListView(generics.ListAPIView):
    serializer_class = AlertSerializer

    def get_queryset(self):
        qs = Alert.objects.select_related('device').order_by('-timestamp')
        device = self.request.query_params.get('device')
        alert_type = self.request.query_params.get('type')
        if device:
            qs = qs.filter(device_id=device)
        if alert_type:
            qs = qs.filter(alert_type=alert_type)
        return qs[:get_limit(self.request)]
