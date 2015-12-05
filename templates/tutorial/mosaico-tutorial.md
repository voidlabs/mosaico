# Preparation

## Create Wireframe

Draw a wireframe of a "maximum" email, it shall contain every variation
and shape of email.

### Identify Features

In the wireframe identify the points of interaction in the email editor

-   Main Blocks
-   editable content
-   variation point
-   user selectable styling

### Identify draggable blocks

-   Identify the smallest parts which can be dragged to the mail. These
    are blocks. Note that a block must be one vertical element which
    covers the entire width of the email. There are no nested blocks.

-   Decide if you need an extra block or you can handle it by variations
    in a block. You need to find a good compromse between having few
    small block (atomic blocks) and many different complex blocks.

# Setup your initial environment

For sake of simplyicity, we make a very simple HTML - Template.

1.  create `templates/tutorial/template-tutorial.html` and enter the
    basic structure:

        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title></title>
        </head>

        <div id="preface">
            <h1>This is the Mosaico Tutorial</h1>

        </div>

        <div data-ko-container="main">
        </div>

        <div id="trailer">
            <h1>This is the end of Mosaico Tutorial</h1>
        </div>


        </body>
        </html>

    The `<div data-ko-container="main">` marks the draggable area as
    well as the draggable blocks.

2.  open `index.html`and add an entry

              var viewModel = {
                showSaved: ko.observable(false),
                edits: ko.observableArray(initialEdits),
                templates: [{
                  name: 'versafix-1', desc: 'The versatile template'
                },{
                  name: 'tedc15', desc: 'The TEDC15 template'
                },
                {
                  name: 'tutorial', desc: 'Mosaico-tutorial'
                }]
              };

3.  create the previews

    Now we need to generate the thumbnails for the template. Mosaico
    provides a grunt task for this which in this case should be
    restricted to the tutorial template

        grunt makeThumbs  

    would generate thumbnails for all templates. Please restrict to
    tutorial by using

        grunt makeThumbs:main:tutorial

4.  start the local server

        node_modules/grunt-cli/bin/grunt

5.  Visit localhost:9000

    you see the selection of tempates with previews

    ![editor][] 

6.  click on "tutorial" in order to create an email which is an instance
    of "tutorial". In other words, the new email is based on the
    template "tutorial"

    ![tutorial template][] 

# Create a draggable blocks

Draggable blocks is the first concept how to compose an email. Draggable
blocks are taken from the block library in the left pane and copied to
the email by drag and drop.

1.  add to

        <div data-ko-container="main">

            <div data-ko-block="HeaderAndText">
                <h1>this is header</h1>
                <div>
                    this is text
                </div>
            </div>

        </div>

    With this we have one draggable block called "HeaderAndText"

2.  recreate the previews

        node_modules/grunt-cli/bin/grunt makeThumbs

3.  start the local server again

        node_modules/grunt-cli/bin/grunt

    ![draggable][]

# specify editable content

1.  create the container for the mosaico classes.

        <head>
            <meta charset="UTF-8">
            <title></title>


            <style type="text/css">
                @supports
                    -ko-blockdefs {

                    text {
                        widget: text
                    }
                }

            </style>
        </head>

    The section `@supports -ko-blockdefs {}` is declared in a way
    similar to CSS styles but they are no way related to CSS styles. In
    fact it is a way for the template author to declare
    object/properties/content types and much more. This tutorial refers
    the entries of this section as "mosaico-class".

    A "mosaico-class" is an entity which defines values applicable for
    html attributes, css properties, mosaico configuration etc.

    In the example here, we have created an "mosaico-class" named
    "text". The attribute "widget" says that it represents text.

    In this case in -ko-blockdefs we have a mosaico class named "text".
    The attribute "widget" says that this is a text

    TODO
    :   do we really need this "text"? It seems to work even without it.

2.  enhance the draggable block with markup for editable text

            <div data-ko-block="HeaderAndText">
                <h1 data-ko-editable="text">this is header</h1>

                <div data-ko-editable="text">
                    this is text
                </div>
            </div>

    We have marked to locations as editable by the HTML-attribute
    'data-ko-editable'. The value of this attribute refers to a
    "mosaico- class" named "text" which we have declared in the previous
    step.

3.  refresh your browser

    Now the header and the body are editable. If you click on it, you
    get a text editor. Note that if you change the header, the body
    changes as well. The reason is that the mosaico class "text" is
    referenced in both elements. In fact both elements refer to the same
    instance of the "mosaico-class" name "text".

4.  to overcome this change the data-ko-editable attributes as follows:

            <div data-ko-block="HeaderAndText">
                <h1 data-ko-editable="headerText">this is header</h1>

                <div data-ko-editable="bodyText">
                    this is text
                </div>
            </div>

    This notation creates two different instances of the "mosaico-class"
    named "text". This is an implicit mechanism called "magic
    autodeprefix" so when you try to use a variable named "headerText"
    mosaico will try to see if you defined it as "headerText" (in the
    @supports section) and if it doesn't find it, it will look for
    "text" (camel-case deprefixing) and so on.

    In our case we only have "text" so "headerText" and "bodyText"
    refers to particular instances of the "mosaico-class" name "text".

5.  refresh your browser to see the results. You can now edit the header
    and the body text independent from each other.

    You also observe that header text is only a single line while the
    body text can be paragraphs etc. Reason is that mosaico derives the
    editing capabiliteis from the related html element:

    At this time data-ko-editable autodetect a 2 kind of editable areas.

    -   If you apply it to `<TD>` or `<DIV>` then you get a "multiline"
        editor (full toolbar).

    -   If, instead, you apply it to another element, then you get a
        simpler editor thought for single line.

# make the structure of the content customizable

The content customization is the second concept how to compose an email.
Content customization allows to control the visibility and geometry
parameters of an inserted block.

1.  create a new block

        <div data-ko-block="fixedList">

            <h1 data-ko-editable="headerText">fixed size list</h1>

            <ul>
                <li>
                    <div data-ko-editable="firstBodyText">item 1</div>
                </li>
                <li data-ko-display="listsize gt 1 ">
                    <div data-ko-editable="secondBodyText">item 2</div>
                </li>
                <li data-ko-display="listsize gt 2">
                    <div data-ko-editable="thirdBodyText">item 3</div>
                </li>
            </ul>
        </div>

    We now introduce the new HTML attribute `data-ko-display`. The value
    of this attribute is a mosaico-expression. If this expression yields
    "true" then the HTML-element in question will be inserted in the
    resulting email and its content is preocessed.

2.  enhance your style `ko-blockdefs` by another "mosaico-class" named
    "listsize"

        listsize {
            widget: select;
            options: 1 | 2 | 3;
        }

    The attributes of this class indicate that

    -   it shall use the selector widget
    -   the selectable options are "1", "2" or "3"

3.  refresh the previews (`node_modules/grunt-cli/bin/grunt makeThumbs`)

4.  refresh your browser to see the results. Now you have another block
    with the list. Drag this block to your email.

    Click into the inserted block, you see that the list has one item.
    The editor automatically switches to the "CONTENT" pane which
    provides a widget where you can select the listsize.

    As you select another list size, you can observe that number of
    visible items changes in the email.

    ![customized content][]

# make the style customizable

The style customization is the second concept how to compose an email.

1.  create a "mosaico-class" named 'color'

        color {
            widget: color;
        }

    Hint: you do this in the CSS section @supports -ko-blockdefs

2.  change the block definition for "fixedlist" to start with

        <div data-ko-block="fixedlist" style="background-color: #f0f0f0; -ko-background-color: @color;">

    This change introduces

    1.  the background-color is editable according to the
        "mosaico-class" 'color'
    2.  a default for background-color is provided

        TODO
        :   how can we provide a global default for 'color'

3.  create a new email from the template. (Note that we introduced an
    incompatible change in the template. Therefore emails of the
    previous version cannot be loaded anymore.)

    Again drag the "fixedlist" block to your email. You see that the
    background of the block is grey.

    Switch to the "STYLES" pane. There you can change the background
    color for all blocks or for the current active block.

    [Customized Style][]

# Customize TinyMce

TODO
:   add contents here

  [editor]: screenshot_384.jpg
  [tutorial template]: screenshot_385.jpg
  [draggable]: screenshot_386.jpg
  [customized content]: screenshot_407.jpg
  [Customized Style]: screenshot_408.jpg
