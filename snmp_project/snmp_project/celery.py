import os
from celery import Celery

# تعيين إعدادات Django الافتراضية لتطبيق Celery
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'snmp_project.settings')

app = Celery('snmp_project')

# استخدام إعدادات Django مع بادئة CELERY_
app.config_from_object('django.conf:settings', namespace='CELERY')

# اكتشاف مهام الـ Celery تلقائياً من التطبيقات المسجلة
app.autodiscover_tasks()