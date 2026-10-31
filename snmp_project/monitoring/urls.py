from django.urls import path
from .views import AlertListView, DeviceDetailView, DeviceListView, DeviceMetricsView, DevicePollView

urlpatterns = [
    path('devices/', DeviceListView.as_view(), name='device-list'),
    path('devices/<int:pk>/', DeviceDetailView.as_view(), name='device-detail'),
    path('devices/<int:pk>/metrics/', DeviceMetricsView.as_view(), name='device-metrics'),
    path('devices/<int:pk>/poll/', DevicePollView.as_view(), name='device-poll'),
    path('alerts/', AlertListView.as_view(), name='alert-list'),
]
