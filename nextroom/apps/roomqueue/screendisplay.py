from nextroom.apps.roomqueue.models import *
from django.db.models import Q


def get_occupied_rooms():
    return Room.objects.exclude(status = 'C').order_by('timestampinqueue')

def get_available_rooms():
    return Room.objects.filter(status = 'C').order_by('timestampinqueue')
    
def get_nurse_rooms():
    return [get_user_room_status_dict(r) for r in get_users_by_type('nurse')]
    
def get_doctor_rooms():
    return [get_user_room_status_dict(r) for r in get_users_by_type('doctor')]
        
def get_room_assignments_for_user(user):
    return [x for x in Room.objects.order_by('timestampinqueue') if  user in x.assignedto.all() ]
    
def get_accepted_rooms_for_user(user):
    return [x for x in get_room_assignments_for_user(user) if (x.status == 'A') ]

def get_users_by_type(type):
    return User.objects.filter( Q(type__exact = type) | Q(type__exact = 'all'+ type +'s'))

def get_user_room_status_dict(user):
    def only_roomnumber(roomlist):
        return [r.roomnumber for r in roomlist]
    return { 'name' : user.name,
             'num_accepted': user.num_accepted,
             'color' : user.color,
             'assignedrooms' : only_roomnumber(get_room_assignments_for_user(user)),
             'acceptedrooms' : only_roomnumber(get_accepted_rooms_for_user(user)) }    
    
#from nextroom.apps.roomqueue.screendisplay import *
# get_room_assignments_for_user(User.objects.get(name='Dr. Pepper'))

# get_user_room_status_dict(User.objects.get(name='Dr. Pepper'))

# def get_rooms_by_user_type(type):
#     rooms = Room.objects.order_by('roomnumber')
#     userset = set(User.objects.filter( Q(type__exact = type) | Q(type__exact = 'all'+ type +'s')))
#     def anonymous(item):
#         roomset = set(item.assignedto.all())
#         intersect = userset.intersection(roomset) 
#         return len(intersect) > 0
#     return [x for x in rooms if anonymous(x)]