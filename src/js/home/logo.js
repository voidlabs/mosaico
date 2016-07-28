var makeMosaicoTable = function() {
    var data = [
        '#1## 7### 8##4 ##9# 1 #2## ##9#       ',
        '#<#4 #  3 #^^  #  # # #    #  6  2 ##9',
        '5<## #  #  ### 7### # 3    #  #  # # #',
        '#<0# ##0# ###6 2  # # ##8# 5###<## ###'
    ];
    var t = $('<table class="mosaico-text" id="mosaico-logo" />');
    var rnd1, rnd2, tr, className;
    for (var i = 0; i < data.length; i++) {
        tr = $('<tr />');
        for (var j = 0; j < data[i].length; j++) {
            className = 'on';
            rnd1 = rnd2 = '';
            switch (data[i].substr(j, 1)) {
                case '#': rnd1 = 'ce'; break;
                case '<':
                case '^':
                case ' ': className = 'off'; break;
                default:
                    rnd1 = "cc c"+data[i].substr(j, 1);
                    rnd2 = "s"+Math.floor((Math.random() * 10));
            }
            if (j > 0 && data[i].substr(j-1, 1) == '<') className += " pullleft";
            if (i > 0 && data[i-1].substr(j, 1) == '^') className += " pullup";
            var td = $('<td><div class="'+className+" "+rnd1+" "+rnd2+'"></div></td>');
            tr.append(td);
        }
        t.append(tr);
    }
    return t;
};
$(function() {
    makeMosaicoTable().appendTo($('.logoContainer'));
    $('.logoImage').remove();
});
// $('<hr/>').appendTo($('body'));