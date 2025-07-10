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
  export interface ChartData {
    [key: string]: string | number | boolean | null | undefined
  }

  export interface ChartDimensions {
    width?: number
    height?: number
  }

  export interface BaseChartProps extends ChartDimensions {
    children?: React.ReactNode
    className?: string
    style?: React.CSSProperties
  }

  export interface AreaProps {
    children?: React.ReactNode
    dataKey?: string
    fill?: string
    stroke?: string
    strokeWidth?: number
    className?: string
  }
  
  export interface AreaChartProps {
    children?: React.ReactNode
    data?: ChartData[]
    margin?: { top?: number; right?: number; bottom?: number; left?: number }
    className?: string
  }
  
  export interface LineProps {
    children?: React.ReactNode
    dataKey?: string
    stroke?: string
    strokeWidth?: number
    dot?: boolean | React.ComponentType
    className?: string
  }
  
  export interface LineChartProps {
    children?: React.ReactNode
    data?: ChartData[]
    margin?: { top?: number; right?: number; bottom?: number; left?: number }
    className?: string
  }
  
  export interface ResponsiveContainerProps {
    children?: React.ReactNode
    width?: string | number
    height?: string | number
    aspect?: number
    className?: string
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