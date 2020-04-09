exports.listify = listify;

function listify() {

    var list = "";
    for (var i in arguments) {
        list = list + arguments[i] + ", ";
    }
    list = list.slice(0, -2);

    return list;
}
