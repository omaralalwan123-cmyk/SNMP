from django.db import models

class Device(models.Model):
    ip_address = models.CharField(max_length=45, unique=True) 
    
    def __str__(self):
        return self.ip_address

class Metric(models.Model):
    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name='metrics')
    timestamp = models.DateTimeField(auto_now_add=True) 
    cpu_usage = models.FloatField()                      
    interface_status = models.CharField(max_length=20)   

    def __str__(self):
        return f"{self.device.ip_address} - {self.timestamp}"

class Alert(models.Model):
    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name='alerts')
    alert_message = models.TextField()                  
    timestamp = models.DateTimeField(auto_now_add=True) 

    def __str__(self):
        return f"Alert: {self.alert_message} ({self.timestamp})"