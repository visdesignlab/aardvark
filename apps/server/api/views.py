from rest_framework.views import APIView
from rest_framework.response import Response
from .serializers import HelloWorldSerializer

class HelloWorldView(APIView):
    def get(self, request):
        data = {'hello': 'world'}
        serializer = HelloWorldSerializer(data)
        return Response(serializer.data)
