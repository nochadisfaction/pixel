import type { RehypePlugins, RemarkPlugins } from 'astro'
import type { CreateProperties } from 'rehype-external-links'
import { rehypeHeadingIds } from '@astrojs/markdown-remark'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeCallouts from 'rehype-callouts'
import rehypeExternalLinks from 'rehype-external-links'
import rehypeKatex from 'rehype-katex'
import remarkDirective from 'remark-directive'

import remarkImgattr from 'remark-imgattr'
import remarkMath from 'remark-math'
import { visit } from 'unist-util-visit'
import { FEATURES, UI } from '../src/config'
import remarkDirectiveSugar from './remark-directive-sugar'

import remarkGenerateOgImage from './remark-generate-og-image'

import remarkImageContainer from './remark-image-container'
import remarkReadingTime from './remark-reading-time'

export const remarkPlugins: RemarkPlugins = [
  // https://github.com/remarkjs/remark-directive
  remarkDirective,
  remarkDirectiveSugar,
  remarkImageContainer,
  // https://github.com/OliverSpeir/remark-imgattr
  remarkImgattr,
  // https://github.com/remarkjs/remark-math/tree/main/packages/remark-math
  remarkMath,
  remarkReadingTime,
  ...(Array.isArray(FEATURES.ogImage) && FEATURES.ogImage[0]
    ? [remarkGenerateOgImage]
    : []),
]

export const rehypePlugins: RehypePlugins = [
  // https://docs.astro.build/en/guides/markdown-content/#heading-ids-and-plugins
  rehypeHeadingIds,
  // https://github.com/remarkjs/remark-math/tree/main/packages/rehype-katex
  rehypeKatex,
  // https://github.com/lin-stephanie/rehype-callouts
  [
    rehypeCallouts,
    {
      theme: 'vitepress',
    },
  ],
  // https://github.com/rehypejs/rehype-external-links
  [
    rehypeExternalLinks,
    {
      rel: UI.externalLink.newTab ? 'noopener noreferrer' : [],
      content: (el: Parameters<CreateProperties>[0]) => {
        if (!UI.externalLink.newTab || !UI.externalLink.showNewTabIcon) {
          return null
        }

        let hasImage = false
        visit(el, 'element', (childNode) => {
          if (childNode.tagName === 'img') {
            hasImage = true
            return false
          }
        })
        if (hasImage) {
          return null
        }

        return {
          type: 'text',
          value: '',
        }
      },
      contentProperties: (el: Parameters<CreateProperties>[0]) => {
        if (!UI.externalLink.newTab || !UI.externalLink.showNewTabIcon) {
          return null
        }

        let hasImage = false
        visit(el, 'element', (childNode) => {
          if (childNode.tagName === 'img') {
            hasImage = true
            return false
          }
        })
        if (hasImage) {
          return null
        }

        return {
          'u-i-carbon-arrow-up-right': true,
          'className': ['new-tab-icon'],
          'aria-hidden': 'true',
        }
      },
      properties: (el: Parameters<CreateProperties>[0]) => {
        const props: Record<string, unknown> = {}
        const href = el.properties?.['href']

        if (!href || typeof href !== 'string') {
          return props
        }

        if (UI.externalLink.newTab) {
          props['target'] = '_blank'
          props['ariaLabel'] = 'Open in new tab'
          if (
            UI.externalLink.cursorType.length > 0 &&
            UI.externalLink.cursorType !== 'pointer'
          ) {
            props['className'] = Array.isArray(el.properties?.['className'])
              ? [
                  ...(el.properties?.['className'] as string[]),
                  'external-link-cursor',
                ]
              : ['external-link-cursor']
          }
        }

        return props
      },
    },
  ],
  // https://github.com/rehypejs/rehype-autolink-headings
  [
    rehypeAutolinkHeadings,
    {
      behavior: 'append',
      properties: (el: Parameters<CreateProperties>[0]) => {
        let content = ''
        visit(el, 'text', (textNode) => {
          content += textNode.value
        })
        return {
          'class': 'header-anchor',
          'tab-index': 0,
          'aria-hidden': 'false',
          'aria-label': content ? `Link to ${content}` : undefined,
          'data-pagefind-ignore': true,
        }
      },
      content: {
        type: 'text',
        value: '#',
      },
    },
  ],
]
