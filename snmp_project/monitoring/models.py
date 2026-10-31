from django.db import models

class Device(models.Model):
    ip_address = models.CharField(max_length=45, unique=True)

    def __str__(self):
        return self.ip_address

class Metric(models.Model):
    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name='metrics')
    timestamp = models.DateTimeField(auto_now_add=True)
    # null عندما يكون الجهاز غير متاح (Unreachable) حتى لا تُسجَّل قيمة 0% مضللة
    cpu_usage = models.FloatField(null=True, blank=True)
    # Up / Down / Unreachable
    interface_status = models.CharField(max_length=20)
    interfaces_up = models.PositiveIntegerField(null=True, blank=True)
    interfaces_total = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        indexes = [models.Index(fields=['device', '-timestamp'])]

    def __str__(self):
        return f"{self.device.ip_address} - {self.timestamp}"

class Alert(models.Model):
    TYPE_CPU = 'cpu'
    TYPE_INTERFACE = 'interface'
    TYPE_UNREACHABLE = 'unreachable'
    TYPE_CHOICES = [
        (TYPE_CPU, 'High CPU'),
        (TYPE_INTERFACE, 'Interface Down'),
        (TYPE_UNREACHABLE, 'Device Unreachable'),
    ]

    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name='alerts')
    alert_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default=TYPE_CPU)
    alert_message = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Alert: {self.alert_message} ({self.timestamp})"
