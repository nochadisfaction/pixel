"use client"

import { useToast } from '@/hooks/useToast'
import { useState, useCallback } from 'react'
import {
  BasicListSection,
  OrderedListSection,
  ListVariantsSection,
  ListSizesSection,
  DividedListSection,
  HorizontalListSection,
  ListWithIconsSection,
  ListStatesSection,
  ListSuffixesSection,
  HoverableListSection,
  MaxItemsListSection,
  ListGroupsSection,
  NestedListSection
} from './ListSections'

// Pre-define constants outside component to reduce re-computation
const INITIAL_EXPANDED_GROUPS = {
  fruits: true,
  vegetables: false,
} as const

const INITIAL_EXPANDED_ITEMS = {
  animals: false,
  electronics: true,
} as const

const LONG_LIST_ITEMS = Array.from({ length: 15 }, (_, i) => `Item ${i + 1}`)

export function ListDemo() {
  const { showToast } = useToast()

  const [expandedGroups, setExpandedGroups] = useState(INITIAL_EXPANDED_GROUPS)
  const [expandedItems, setExpandedItems] = useState(INITIAL_EXPANDED_ITEMS)

  const handleExpandedChange = useCallback((group: string, expanded: boolean) => {
    setExpandedGroups(prev => ({
      ...prev,
      [group]: expanded,
    }))
  }, [])

  const handleItemExpandedChange = useCallback((item: string, expanded: boolean) => {
    setExpandedItems(prev => ({
      ...prev,
      [item]: expanded,
    }))
  }, [])

  const handleAction1 = useCallback(() => {
    showToast('Action 1: You clicked Action 1')
  }, [showToast])

  const handleAction2 = useCallback(() => {
    showToast('Action 2: You clicked Action 2')
  }, [showToast])

  const handleAction3 = useCallback(() => {
    showToast('Action 3: You clicked Action 3')
  }, [showToast])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      <BasicListSection />
      <OrderedListSection />
      <ListVariantsSection />
      <ListSizesSection />
      <DividedListSection />
      <HorizontalListSection />
      <ListWithIconsSection />
      <ListStatesSection />
      <ListSuffixesSection />
      <HoverableListSection 
        onAction1={handleAction1}
        onAction2={handleAction2}
        onAction3={handleAction3}
      />
      <MaxItemsListSection items={LONG_LIST_ITEMS} />
      <ListGroupsSection 
        expandedGroups={expandedGroups}
        onExpandedChange={handleExpandedChange}
      />
      <NestedListSection 
        expandedItems={expandedItems}
        onItemExpandedChange={handleItemExpandedChange}
      />
    </div>
  )
}
