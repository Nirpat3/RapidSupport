import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";
import { 
  MessageSquare, 
  Users, 
  Bot, 
  BookOpen, 
  BarChart3, 
  Settings,
  TrendingUp,
  Activity,
  Bell,
  FileText,
  Shield,
  Zap,
  Server,
  Database,
  Cpu,
  Wifi,
  HardDrive,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from "recharts";

const revenueData = [
  { month: "Jan", revenue: 4200, target: 4000 },
  { month: "Feb", revenue: 4800, target: 4200 },
  { month: "Mar", revenue: 5100, target: 4500 },
  { month: "Apr", revenue: 4900, target: 4800 },
  { month: "May", revenue: 5600, target: 5000 },
  { month: "Jun", revenue: 6200, target: 5500 },
  { month: "Jul", revenue: 6800, target: 6000 },
];

const systemHealthData = [
  { name: "API", health: 99.9, status: "healthy" },
  { name: "Database", health: 99.5, status: "healthy" },
  { name: "Cache", health: 98.2, status: "healthy" },
  { name: "Queue", health: 97.8, status: "warning" },
  { name: "Storage", health: 99.1, status: "healthy" },
];

const microservices = [
  {
    id: "conversations",
    title: "Conversations",
    description: "Real-time customer messaging",
    icon: MessageSquare,
    href: "/conversations",
    color: "blue",
    stats: { value: "24", label: "Active" },
    glow: "glow-blue"
  },
  {
    id: "customers",
    title: "Customers",
    description: "Customer relationship management",
    icon: Users,
    href: "/customers",
    color: "green",
    stats: { value: "1.2K", label: "Total" },
    glow: "glow-green"
  },
  {
    id: "ai-config",
    title: "AI Agents",
    description: "Configure AI assistants",
    icon: Bot,
    href: "/ai-configuration",
    color: "purple",
    stats: { value: "5", label: "Active" },
    glow: "glow-purple"
  },
  {
    id: "knowledge",
    title: "Knowledge Base",
    description: "Documentation & articles",
    icon: BookOpen,
    href: "/knowledge",
    color: "amber",
    stats: { value: "156", label: "Articles" },
    glow: "glow-amber"
  },
  {
    id: "analytics",
    title: "Analytics",
    description: "Performance insights",
    icon: BarChart3,
    href: "/analytics",
    color: "cyan",
    stats: { value: "98%", label: "CSAT" },
    glow: "glow-cyan"
  },
  {
    id: "activity",
    title: "Activity",
    description: "System notifications",
    icon: Bell,
    href: "/activity",
    color: "rose",
    stats: { value: "12", label: "New" },
    glow: "glow-rose"
  },
];

const quickStats = [
  { label: "Total Revenue", value: "$42.5K", change: "+12.5%", positive: true, icon: DollarSign },
  { label: "Response Time", value: "1.2min", change: "-8.3%", positive: true, icon: Zap },
  { label: "Resolution Rate", value: "94.2%", change: "+2.1%", positive: true, icon: CheckCircle },
  { label: "Active Agents", value: "8", change: "0%", positive: true, icon: Users },
];

const iconColors: Record<string, string> = {
  blue: "bg-blue-500/20 text-blue-400",
  green: "bg-emerald-500/20 text-emerald-400",
  purple: "bg-purple-500/20 text-purple-400",
  amber: "bg-amber-500/20 text-amber-400",
  cyan: "bg-cyan-500/20 text-cyan-400",
  rose: "bg-rose-500/20 text-rose-400",
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  }
};

const cardHoverVariants = {
  rest: { scale: 1, y: 0 },
  hover: { 
    scale: 1.02, 
    y: -4,
    transition: {
      duration: 0.2,
      ease: "easeOut"
    }
  }
};

export default function DashboardPage() {
  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-8" data-testid="dashboard-page">
      {/* Hero Header with Animated Gradient */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden rounded-2xl animated-gradient p-6 sm:p-8 text-white"
      >
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-white/10 backdrop-blur-sm">
                <Sparkles className="w-6 h-6" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" data-testid="dashboard-title">
                Command Center
              </h1>
            </div>
            <p className="text-white/80 max-w-xl">
              Your unified dashboard for managing support operations. Monitor services, track performance, and optimize workflows.
            </p>
          </div>
          <Button 
            variant="secondary" 
            className="gap-2 bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm"
            data-testid="button-refresh"
          >
            <Activity className="w-4 h-4" />
            Live Mode
          </Button>
        </div>
      </motion.div>

      {/* Quick Stats Row */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {quickStats.map((stat, index) => (
          <motion.div key={stat.label} variants={itemVariants}>
            <Card className="glass-card border-0 overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{stat.label}</p>
                    <p className="text-2xl font-bold mt-1" data-testid={`stat-${stat.label.toLowerCase().replace(/ /g, '-')}`}>{stat.value}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {stat.positive ? (
                        <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3 text-rose-500" />
                      )}
                      <span className={`text-xs ${stat.positive ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {stat.change}
                      </span>
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-primary/10">
                    <stat.icon className="w-5 h-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Service Launchpad Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Services</h2>
          <Badge variant="outline" className="gap-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            All Systems Operational
          </Badge>
        </div>
        
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {microservices.map((service) => (
            <motion.div 
              key={service.id} 
              variants={itemVariants}
              whileHover="hover"
              initial="rest"
            >
              <Link href={service.href}>
                <motion.div variants={cardHoverVariants}>
                  <Card 
                    className={`glass-card border-0 cursor-pointer transition-all duration-300 hover:${service.glow}`}
                    data-testid={`service-${service.id}`}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`p-3 rounded-xl ${iconColors[service.color]}`}>
                          <service.icon className="w-6 h-6" />
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold">{service.stats.value}</p>
                          <p className="text-xs text-muted-foreground">{service.stats.label}</p>
                        </div>
                      </div>
                      <h3 className="font-semibold text-lg mb-1">{service.title}</h3>
                      <p className="text-sm text-muted-foreground">{service.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Dashboard Widgets Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue Widget */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Card className="glass-card border-0">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10">
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Revenue Overview</CardTitle>
                    <CardDescription>Monthly performance vs target</CardDescription>
                  </div>
                </div>
                <Badge className="bg-emerald-500/10 text-emerald-500 border-0">
                  +18.2%
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="targetGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis 
                      dataKey="month" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `$${value/1000}k`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        boxShadow: 'var(--glass-shadow)'
                      }}
                      formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="target" 
                      stroke="hsl(217, 91%, 60%)" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      fill="url(#targetGradient)" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="hsl(160, 84%, 39%)" 
                      strokeWidth={2}
                      fill="url(#revenueGradient)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* System Health Widget */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <Card className="glass-card border-0">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Server className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">System Health</CardTitle>
                    <CardDescription>Infrastructure status</CardDescription>
                  </div>
                </div>
                <Badge className="bg-emerald-500/10 text-emerald-500 border-0">
                  99.2% Uptime
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {systemHealthData.map((system, index) => {
                const Icon = index === 0 ? Wifi : index === 1 ? Database : index === 2 ? Cpu : index === 3 ? Activity : HardDrive;
                return (
                  <motion.div 
                    key={system.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                    className="space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{system.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{system.health}%</span>
                        {system.status === "healthy" ? (
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                        )}
                      </div>
                    </div>
                    <Progress 
                      value={system.health} 
                      className="h-2"
                    />
                  </motion.div>
                );
              })}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Actions Footer */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.7 }}
        className="flex flex-wrap gap-3 justify-center"
      >
        <Link href="/settings">
          <Button variant="outline" className="gap-2 glass-subtle border-0">
            <Settings className="w-4 h-4" />
            Settings
          </Button>
        </Link>
        <Link href="/ai-performance">
          <Button variant="outline" className="gap-2 glass-subtle border-0">
            <TrendingUp className="w-4 h-4" />
            AI Performance
          </Button>
        </Link>
        <Link href="/files">
          <Button variant="outline" className="gap-2 glass-subtle border-0">
            <FileText className="w-4 h-4" />
            Files
          </Button>
        </Link>
        <Link href="/user-management">
          <Button variant="outline" className="gap-2 glass-subtle border-0">
            <Shield className="w-4 h-4" />
            Team
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}
