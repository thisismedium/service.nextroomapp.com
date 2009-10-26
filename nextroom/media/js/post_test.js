function set_room_xml() {
    $.get("/room/", { 'room': $("#id_room").val() }, function(xml) {
        $("#room").val(xml);
    }, 'text');
}

function update_user() {
    $("#post_test_form").attr("action", "/update/?user=" + $("#id_user").val());
}

$(document).ready(function() {
    $("#id_user").change(function() {
        update_user();
    });
    
    $("#id_room").change(function() {
        set_room_xml();
    });
    
    set_room_xml();
    update_user();
});