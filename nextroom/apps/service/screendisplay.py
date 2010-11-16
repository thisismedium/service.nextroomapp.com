from nextroom.apps.service.models import *
from django.db.models import Q

def get_users_by_type(practice, type):
    return User.objects.filter(practice=practice).filter( Q(type__exact = type) | Q(type__exact = 'all'+ type +'s'))

def get_occupied_rooms(practice):
    return Room.objects.filter(practice=practice).exclude(status = 'C').order_by('timestampinqueue')

def get_available_rooms(practice):
    return Room.objects.filter(practice=practice).filter(status = 'C').order_by('timestampinqueue')
    
def get_nurse_rooms(practice):
    return [get_user_room_status_dict(r) for r in get_users_by_type(practice, 'nurse')]
    
def get_doctor_rooms(practice):
    return [get_user_room_status_dict(r) for r in get_users_by_type(practice, 'doctor')]
        
def get_room_assignments_for_user(practice, user):
    return [x for x in Room.objects.filter(practice=practice).order_by('timestampinqueue') if  user in x.assignedto.all() ]
    
def get_accepted_rooms_for_user(practice, user):
    return [x for x in get_room_assignments_for_user(user) if (x.status == 'A') ]

def get_user_room_status_dict(user):
    def only_roomnumber(roomlist):
        return [r.name for r in roomlist]
    return { 'name' : user.name,
             'num_accepted': user.num_accepted,
             'color' : user.color,
             'assignedrooms' : only_roomnumber(get_room_assignments_for_user(user)),
             'acceptedrooms' : only_roomnumber(get_accepted_rooms_for_user(user)) }    
