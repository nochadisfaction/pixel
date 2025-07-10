// Type declarations for modules without TypeScript definitions

declare module '@astrojs/ts-plugin' {
  interface PluginConfig {
    name: string
  }
  const plugin: PluginConfig
  export = plugin
}

declare module 'react-dom/client' {
  export * from 'react-dom'
}

// For any missing chart/visualization libraries
declare module 'recharts' {
  export interface AreaProps {
    children?: React.ReactNode
    [key: string]: any
  }
  
  export interface AreaChartProps {
    children?: React.ReactNode
    data?: any[]
    width?: number
    height?: number
    [key: string]: any
  }
  
  export interface LineProps {
    children?: React.ReactNode
    [key: string]: any
  }
  
  export interface LineChartProps {
    children?: React.ReactNode
    data?: any[]
    width?: number
    height?: number
    [key: string]: any
  }
  
  export interface ResponsiveContainerProps {
    children?: React.ReactNode
    width?: string | number
    height?: string | number
    [key: string]: any
  }
  
  export const Area: React.ComponentType<AreaProps>
  export const AreaChart: React.ComponentType<AreaChartProps>
  export const Line: React.ComponentType<LineProps>
  export const LineChart: React.ComponentType<LineChartProps>
  export const ResponsiveContainer: React.ComponentType<ResponsiveContainerProps>
}

// Badge component props fix
declare module '@/components/ui/badge' {
  export interface BadgeProps {
    children?: React.ReactNode
    variant?: 'default' | 'secondary' | 'destructive' | 'outline'
    className?: string
  }
  export const Badge: React.ComponentType<BadgeProps>
}

// Table component props fixes
declare module '@/components/ui/table' {
  export interface TableProps {
    children?: React.ReactNode
    className?: string
  }
  
  export interface TableHeadProps {
    children?: React.ReactNode
    className?: string
  }
  
  export interface TableRowProps {
    children?: React.ReactNode
    className?: string
  }
  
  export interface TableCellProps {
    children?: React.ReactNode
    className?: string
  }
  
  export const Table: React.ComponentType<TableProps>
  export const TableHead: React.ComponentType<TableHeadProps>
  export const TableRow: React.ComponentType<TableRowProps>
  export const TableCell: React.ComponentType<TableCellProps>
}

// Global module augmentations
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test'
      PORT?: string
      [key: string]: string | undefined
    }
  }
}

export {}