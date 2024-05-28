from rest_framework import serializers


class HelloWorldSerializer(serializers.Serializer):
    hello = serializers.CharField(default="world")
