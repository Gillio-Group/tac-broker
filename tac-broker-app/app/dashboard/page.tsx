import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Package, ShoppingCart, Users } from 'lucide-react';

const dashboardCards = [
  {
    title: 'Active Listings',
    value: '24',
    description: 'Currently active on Gunbroker',
    icon: Package,
    color: 'bg-blue-100 text-blue-700',
  },
  {
    title: 'Sold Items',
    value: '12',
    description: 'Last 30 days',
    icon: ShoppingCart,
    color: 'bg-green-100 text-green-700',
  },
  {
    title: 'Customers',
    value: '8',
    description: 'Unique buyers',
    icon: Users,
    color: 'bg-orange-100 text-orange-700',
  },
  {
    title: 'Revenue',
    value: '$3,240',
    description: 'Last 30 days',
    icon: BarChart3,
    color: 'bg-purple-100 text-purple-700',
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your Gunbroker selling performance
        </p>
      </div>
      
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {dashboardCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <div className={`rounded-full p-2 ${card.color}`}>
                <card.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Listings</CardTitle>
            <CardDescription>
              Your most recently created and modified listings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center p-6 text-muted-foreground">
              <p>Connect your Gunbroker account to see your listings</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Recent Sales</CardTitle>
            <CardDescription>
              Your most recent completed sales on Gunbroker
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center p-6 text-muted-foreground">
              <p>Connect your Gunbroker account to see your sales</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 