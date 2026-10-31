from django.contrib import admin
from .models import Device, Metric, Alert

admin.site.register(Device)

@admin.register(Metric)
class MetricAdmin(admin.ModelAdmin):
    list_display = ('device', 'timestamp', 'cpu_usage', 'interface_status')
    list_filter = ('device', 'interface_status')

@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display = ('device', 'alert_type', 'alert_message', 'timestamp')
    list_filter = ('device', 'alert_type')
