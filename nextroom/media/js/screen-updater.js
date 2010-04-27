function updateit(){
    var url = '/screen-display-js/';
    $.getJSON(url, function (data){
        setoccupied(data.occupied);
        setavailable(data.available);
        setnurses(data.nurses);
        setdoctors(data.doctors);
        setTimeout('updateit()', 2000);
    });
}

function setnurses(nurselist){
    $('#nurselistings').html(generatehtmllist(nurselist));
}

function setdoctors(doctorlist){
    $('#doctorlistings').html(generatehtmllist(doctorlist));
}

function setoccupied(value){
    $('#numOutput').html(value+'');
}

function setavailable(value){
    $('#numOutput2').html(value+'');
}

function generatehtmllist(userlist){
    var ret = '';
    var alt = 'alt';
    for (u in userlist){ ret += makeuserlisting(userlist[u], alt=togglealt(alt));}
    return ret;
}

function makeuserlisting(user, alt){
    return '<div class="listing '+alt+'">' +
           '<div class="listingLeft">' +
           '<div class="name">'+ user.name + '</div>' +
           '<div class="audio on"></div>' +
           '<div class="numAccepted">'+ user.num_accepted +' Accepted</div>' +
           '<div class="inQueue">'+ user.assignedrooms.length+' In Queue</div>' +
           '<span class="numRoom">'+ user.assignedrooms.join(', ')+'</span>' +
           '</div>' +
           '<div class="listingRight" style="background-color:'+user.color+';">'+
           '<span class="padTop">'+getfirstifnotempty(user.acceptedrooms)+'</span></div>' +
           '</div><!--/.listing-->' +
           '<div class="hr listingHr"><hr></div><!--/.hr-->';
}

function getfirstifnotempty(list){
    if(list.length > 0){
        return list[0];
    }
    else{
        return '';
    }
}

function togglealt(value){
    var classname = 'alt';
    if(value == classname){
        return '';
    }
    else{
        return classname;
    }
}      
           
           
           
           
       
       
   
   