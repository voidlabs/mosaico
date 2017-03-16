tinymce.PluginManager.add('mBlock', function (editor) {
    var mblockList = null;
    function openModalWindow(isImage) {
        if (mblockList) {
            var htmlContent = '<ul>';
            for (var mblock in mblockList) {
                // $('#mblockList').append(
                htmlContent = htmlContent + '<li><a href="javascript:void(0)" '
                    + 'onclick="pushMBlock(' + mblockList[mblock].mbId + ",'" + mblockList[mblock].mbName + "'" + ')">'
                    + mblockList[mblock].mbName + '</a></li>';//);
            }
            if (!mblockList || mblockList.length == 0) {
                htmlContent = 'No MBlock found';
            }
            htmlContent = htmlContent + '</ul>';

            var win = editor.windowManager.open({
                title: "MBlocks",
                body: {
                    type: 'container',
                    name: 'mBlockListContainer',
                    html: htmlContent,
                    width: 700,
                    height: 600
                },
                onSubmit: function (e) {
                    editor.focus();
                    editor.undoManager.transact(function () {
                        editor.setContent(e.data.code);
                    });
                    editor.selection.setCursorLocation();
                    editor.nodeChanged();
                }
            }, {
                    mblocks: mblockList
                });
            Window.tinyMCEwindowManager = win;
            //win.find('#mBlockListContainer').innerHTML=htmlContent;
            //win.find('#code').value(editor.getContent({source_view: true}));
        }
        else {
            getMBlockList();
            return;
        }
    }


    function getMBlockList() {
        $.ajax({
            url: 'data/data.json',
            dataType: 'json',
            success: function (data) {
                mblockList = data;
                $('#mblockList').html('');
                for (var mblock in mblockList) {
                    $('#mblockList').append(
                        '<li><a href="javascript:void(0)" '
                        + 'onclick="pushMBlock(' + mblockList[mblock].mbId + ",'" + mblockList[mblock].mbName + "'" + ')">'
                        + mblockList[mblock].mbName + '</a></li>');
                }
                openModalWindow();
            },
            error: function (a, b) {
                console.log('Error occured while getting mBlock list');
            }
        });
    }

    editor.addCommand("mcemBlock", openModalWindow);
    editor.addButton('mblockButton', {
        image: 'dist/img/blocks.png',
        onclick: openModalWindow
    });

    editor.addMenuItem('mBlock', {
        icon: 'mosaico/dist/img/blocks.png',
        text: 'mBlock',
        context: 'tools',
        onclick: openModalWindow
    });
});