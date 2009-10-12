class AddHeaderMiddleware(object):
    def process_response(self, request, response):
        response['Cache-Control'] = 'no-cache'
        return response