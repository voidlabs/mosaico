var phpApiURL = 'mblocks/mblocks.php';
var selectedImg = null;

function addEvent(ele, event, callback) {
    if (ele.attachEvent) {
        ele.attachEvent(event, callback)
    }
    else {
        ele.addEventListener(event, callback);
    }
}

function getMBlockList() {
    // addEvent(jQuery('.previewbutton')[0], 'click', function () {
    //     var previewHtml = viewModel.getHTMLForPreview();
    //     console.log(previewHtml);
    // });

    jQuery.ajax({
        //url: 'data/data.json',
        url: phpApiURL + '?ajax=getMblockList',
        method: 'post',
        data: { 'ajax': 'getMblockList', 'idID': getParameterByName('idID') },
        dataType: 'json',
        success: function (mblockList) {
            jQuery('#mblockList').html('');
            for (var mblock in mblockList) {

                var hrefObj = jQuery('<a>').html(mblockList[mblock].mbName);
                hrefObj.attr('href', 'javascript:void(0)');
                var liObj = jQuery('<li>');
                liObj.append(hrefObj);

                jQuery('#mblockList').append(liObj);
                var liEle = jQuery('#mblockList').find('li').last();
                var mbId = mblockList[mblock].mbId;
                var mbName = mblockList[mblock].mbName;
                liEle.attr('mbId', mbId);
                liEle.attr('mbName', mbName);
                addEvent(liEle[0], 'click', function () {
                    pushMBlock(jQuery(this).attr("mbId"), jQuery(this).attr("mbName"));
                });
            }
            jQuery('#exportframe').attr('data-bind', 'bindIframe: $data');
        },
        error: function (a, b) {
            console.log('Error occured while getting mBlock list');
        }
    });
}

function getInputSelection(elem) {
    if (typeof elem != "undefined") {
        s = elem[0].selectionStart;
        e = elem[0].selectionEnd;
        return elem.val().substring(s, e);
    } else {
        return '';
    }
}

var mblockIdToEdit = -1;
var mBlockToUpdate = null;
function editMBlock(mBlock) {
    return;
    // if (UI) {
    //     mblockIdToEdit = jQuery(mBlock).attr('mblockid');
    //     mBlockToUpdate = mBlock;
    //     var source = jQuery('<div>').append(jQuery(mBlock).clone()).html();
    //     moveUnderMBlock(source, mBlock);
    // }
}

function removemBlock(obj) {
    var tduploadzone = jQuery(obj).closest('.uploadzone');
    tduploadzone.find('m-block').parent('div').remove();
    tduploadzone.find('img').show();
    tduploadzone.find('.midtools').show();
    tduploadzone.find('.fileuploadtext').show();
    tduploadzone.find('.workzone').show();
    tduploadzone.find('.mo-uploadzone').show();
    tduploadzone.find('.midtoolsMBlock').find('div').hide();
    jQuery(obj).hide();
    tduploadzone.unbind('mouseenter mouseleave')

    tduploadzone.find('.btnAddMBlock').each(function (index, obj) {
        addEvent(obj, 'click', function () {
            openModalWindow(this);
        });
    });
}

function hoverin() {
    jQuery(this).find('.midtoolsMBlock').show();
    jQuery(this).find('.midtoolsMBlock').find('div').show();
}

function hoverout() {
    jQuery(this).find('.midtoolsMBlock').hide();
}

function loadSavedMBlocks(htmlcontent) {
    jQuery('#htmlContentWithDatadiv').empty();
    var divHtmlContent = jQuery(jQuery('#htmlContentWithDatadiv').append(htmlcontent));
    var tdCnt = 0;
    var mBlockId = 0;


    jQuery(divHtmlContent).find('m-block,.uploadzone').each(function (index, obj) {
        if (jQuery(obj).is('m-block') && jQuery(obj).parent().is('div')) {
            var mBlock = jQuery(obj).clone();
            var uploadzone = jQuery(jQuery('#main-wysiwyg-area td.uploadzone')[tdCnt]);

            var mblockId = jQuery(mBlock).attr('mblockid');
            var mblockName = jQuery(mBlock).html().replace('*#', '').replace('#*', '');

            selectedImg = jQuery(uploadzone.find('.midtools').first()).find('div').first();
            pushMBlock(mblockId, mblockName);
            tdCnt++;
        }
        else if (jQuery(obj).hasClass('uploadzone')) {
            tdCnt++;
        }
        else if (jQuery(obj).parent().is('p')) {
            var indP = jQuery(divHtmlContent).find('p').index(jQuery(obj).parent());
            jQuery(jQuery('#main-wysiwyg-area p')[indP]).html('');
            jQuery(jQuery('#main-wysiwyg-area p')[indP]).html(jQuery(obj).parent().html());
        }
        else if (jQuery(obj).parent().is('span')) {
            var indspan = jQuery(divHtmlContent).find('span').index(jQuery(obj).parent());
            jQuery(jQuery('#main-wysiwyg-area span')[indspan]).html('');
            jQuery(jQuery('#main-wysiwyg-area span')[indspan]).html(jQuery(obj).parent().html());
        }
        else {
            //nothing
        }
    });

    var allbtnAddMBlocks = jQuery('.btnAddMBlock');
    jQuery(allbtnAddMBlocks).each(function (index, obj) {
        addEvent(obj, 'click', function () {
            openModalWindow(this);
        });
    });

    //text contents
    //setTimeout(function () {
    var allEditableTextContents = jQuery(divHtmlContent).find('.mce-content-body');
    jQuery(allEditableTextContents).each(function (index, obj) {

        if (jQuery('#main-wysiwyg-area').find('#' + jQuery(obj).attr('id')).length > 0)
            jQuery('#main-wysiwyg-area').find('#' + jQuery(obj).attr('id')).html(jQuery(obj).html());
    });
    //}, 1000);
}

function pushMBlock(mblockId, mblockName) {
    var replacementText = '*#' + escapeHtml(mblockName) + '#*';
    var mBlock = document.createElement("m-block");
    var content = document.createTextNode(replacementText);
    mBlock.appendChild(content);

    jQuery(mBlock).attr('id', 'mblock_' + new Date().getTime().toString());
    jQuery(mBlock).attr('mblockid', mblockId);

    //addEvent(mBlock, 'click', function () {
    // editMBlock(mBlock);
    //});

    if (selectedImg) {
        var parent = jQuery(selectedImg).parent();
        var tduploadzone = parent.closest('.uploadzone');
        var width = tduploadzone.closest('table').attr('width');
        var height = tduploadzone.closest('table').attr('height');

        tduploadzone.find('img').hide();
        tduploadzone.find('.midtools').hide();
        tduploadzone.find('.workzone').hide();
        tduploadzone.find('.mo-uploadzone').hide();
        tduploadzone.find('.fileuploadtext').hide();
        tduploadzone.find('.midtoolsMBlock').find('div').show();

        jQuery(mBlock).width(width);
        jQuery(mBlock).height(height);
        //jQuery(mBlock).css('line-height', height + 'px');

        var mblockDiv = jQuery('<div style="overflow:hidden"></div>')
        jQuery(mblockDiv).width(width);
        jQuery(mblockDiv).height(height);
        mblockDiv.append(mBlock);
        tduploadzone.append(mblockDiv);
        jQuery(tduploadzone).hover(hoverin, hoverout);

        var delmBlockBtn = jQuery(mBlock).closest('.uploadzone').find('.midtoolsMBlock').find('.delete');
        if (delmBlockBtn.length > 0) {
            addEvent(delmBlockBtn[0], 'click', function () {
                removemBlock(delmBlockBtn[0]);
            });
        }

        var addmBlockBtn = jQuery(mBlock).closest('.uploadzone').find('.midtools').find('.btnAddMBlock');
        if (addmBlockBtn.length > 0) {
            addEvent(addmBlockBtn[0], 'click', function () {
                openModalWindow(addmBlockBtn[0]);
            });
        }
    }
    else {
        replaceSelectedText(mBlock, replacementText);
    }

    closeModalWindow();
}

function updateMBlock() {
    //EDIT MBlock
    // jQuery('[data-cke-pa-onclick]').each(function (ind, obj) {
    //     jQuery(obj).removeAttr('data-cke-pa-onclick');//.attr('onclick', 'editMBlock(this)');
    //     addEvent(jQuery(obj)[0], 'click', function () {
    //         editMBlock(this)
    //     });
    // });

    jQuery.ajax({
        url: phpApiURL + '?ajax=getMblock',//'data/data.json',
        method: 'post',
        data: { 'ajax': 'getMblock', 'idID': getParameterByName('idID'), 'mbID': mblockIdToEdit },
        dataType: 'json',
        success: function (data) {
            var replacementText = '*#' + escapeHtml(data.mbName) + '#*';

            //For multiple updates
            // jQuery("[mblockid='" + mblockIdToEdit + "']").each(function (ind, obj) {
            //     jQuery(obj).html(replacementText)
            // });
            mblockIdToEdit = -1;

            //For current mblock update
            jQuery(mBlockToUpdate).html(replacementText);
            //For one element only
            // jQuery('#' + mblockIdToEdit).html('');
            // jQuery('#' + mblockIdToEdit).html(replacementText);
            getMBlockList();
        },
        error: function (a, b) {
            console.log('Error occured while getting mBlock list');
        }
    });
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function replaceSelectedText(mBlock, replacementText) {
    var sel, range;

    if (window.getSelection) {
        sel = window.getSelection();
        if (sel.rangeCount) {
            range = sel.getRangeAt(0);
            range.deleteContents();
            range.insertNode(mBlock);
            return true;
        }
    } else if (document.selection && document.selection.createRange) {
        range = document.selection.createRange();
        if (range) {
            //range.text = replacementText;
            range.insertNode(mBlock);
            return true;
        }
    }
    return false;
}

function openModalWindow(img) {
    selectedImg = img;
    //knckoutCallback = callback;
    var modal = document.getElementById('mBlockListDialog');
    modal.style.display = "block";

    addEvent(document.getElementById('btnDialogClose'), 'click', function () {
        closeModalWindow();
    });
}

function closeModalWindow() {
    var modal = document.getElementById('mBlockListDialog');
    modal.style.display = "none";
}

function getParameterByName(name, url) {
    if (!url) {
        url = window.location.href;
    }
    name = name.replace(/[\[\]]/g, "\\jQuery&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|jQuery)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}
