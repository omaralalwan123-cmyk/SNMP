# استخدام صورة بايثون الرسمية
FROM python:3.10-slim

# ضبط متغيرات البيئة لمنع تخزين الملفات المؤقتة وطباعة المخرجات مباشرة
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# تحديد المجلد الرئيسي داخل الحاوية
WORKDIR /app

# تثبيت متطلبات النظام الأساسية إذا لزم الأمر
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# نسخ ملف المتطلبات وتثبيتها
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# نسخ باقي ملفات المشروع إلى الحاوية
COPY . /app/