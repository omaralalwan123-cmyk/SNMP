from django.urls import path
from .views import DeviceListView, DeviceMetricsView, AlertListView

urlpatterns = [
    path('devices/', DeviceListView.as_view(), name='device-list'),
    path('devices/<int:pk>/metrics/', DeviceMetricsView.as_view(), name='device-metrics'),
    path('alerts/', AlertListView.as_view(), name='alert-list'),
]