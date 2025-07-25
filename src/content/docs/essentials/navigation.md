---
title: 'Navigation'
description: 'The navigation field in mint.json defines the pages that go in the navigation menu'
pubDate: '2025-01-01'
author: 'Pixelated Empathy Team'
draft: false
toc: true
share: true
icon: 'map'
---

The navigation menu is the list of links on every website.

You will likely update `mint.json` every time you add a new page. Pages do not show up automatically.

## Navigation syntax

Our navigation syntax is recursive which means you can make nested navigation groups. You don't need to include `.mdx` in page names.


```json Regular Navigation
"navigation": [
    {
        "group": "Getting Started",
        "pages": ["quickstart"]
    }
]
```

```json Nested Navigation
"navigation": [
    {
        "group": "Getting Started",
        "pages": [
            "quickstart",
            {
                "group": "Nested Reference Pages",
                "pages": ["nested-reference-page"]
            }
        ]
    }
]
```


## Folders

Simply put your MDX files in folders and update the paths in `mint.json`.

For example, to have a page at `https://yoursite.com/your-folder/your-page` you would make a folder called `your-folder` containing an MDX file called `your-page.mdx`.


You cannot use `api` for the name of a folder unless you nest it inside another folder. Mintlify uses Next.js which reserves the top-level `api` folder for internal server calls. A folder name such as `api-reference` would be accepted.


```json Navigation With Folder
"navigation": [
    {
        "group": "Group Name",
        "pages": ["your-folder/your-page"]
    }
]
```

## Hidden Pages

MDX files not included in `mint.json` will not show up in the sidebar but are accessible through the search bar and by linking directly to them.
