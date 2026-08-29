import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Shirt, WishlistShirt, OperationType } from '../types';
import { handleFirestoreError } from '../lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../components/ui/command';
import { buttonVariants } from '../components/ui/button';
import { Shirt as ShirtIcon, DollarSign, Clock, Heart, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '../lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const COLORS = ['#18181b', '#3f3f46', '#71717a', '#a1a1aa', '#d4d4d8'];

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  return isMobile;
}

const CustomCurrencyTick = ({ x, y, payload, isXAxis }: any) => {
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        textAnchor={isXAxis ? 'middle' : 'end'}
        fill="var(--muted-foreground)"
        fontSize={12}
      >
        {isXAxis ? (
          <>
            <tspan x={0} dy="12">R$</tspan>
            <tspan x={0} dy="14">{payload.value}</tspan>
          </>
        ) : (
          <>
            <tspan x={-5} dy="-4">R$</tspan>
            <tspan x={-5} dy="14">{payload.value}</tspan>
          </>
        )}
      </text>
    </g>
  );
};

export function Dashboard() {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [shirts, setShirts] = useState<Shirt[]>([]);
  const [wishlistShirts, setWishlistShirts] = useState<WishlistShirt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [selectedPurchaseYear, setSelectedPurchaseYear] = useState<string>('all');
  const [teamOpen, setTeamOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'shirts'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeShirts = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Shirt[];
      setShirts(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'shirts');
      setLoading(false);
    });

    const qWishlist = query(
      collection(db, 'wishlist'),
      where('userId', '==', user.uid)
    );

    const unsubscribeWishlist = onSnapshot(qWishlist, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as WishlistShirt[];
      setWishlistShirts(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'wishlist');
    });

    return () => {
      unsubscribeShirts();
      unsubscribeWishlist();
    };
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-foreground border-t-transparent"></div>
      </div>
    );
  }

  const uniqueTeams = Array.from(new Set(shirts.map(s => s.team))).sort((a,b) => a.localeCompare(b));
  const uniquePurchaseYears = Array.from(new Set(
    shirts.filter(s => s.purchaseDate).map(s => new Date(s.purchaseDate as string).getFullYear().toString())
  )).sort((a,b) => b.localeCompare(a));

  const filteredShirts = shirts.filter(shirt => {
    const matchTeam = selectedTeam === 'all' || shirt.team === selectedTeam;
    const matchYear = selectedPurchaseYear === 'all' || (shirt.purchaseDate && new Date(shirt.purchaseDate).getFullYear().toString() === selectedPurchaseYear);
    return matchTeam && matchYear;
  });

  const filteredWishlist = wishlistShirts.filter(shirt => {
    const matchTeam = selectedTeam === 'all' || shirt.team === selectedTeam;
    const matchYear = selectedPurchaseYear === 'all';
    return matchTeam && matchYear;
  });

  const totalShirts = filteredShirts.length;
  const totalWishlist = filteredWishlist.length;
  const totalInvested = filteredShirts.reduce((acc, shirt) => acc + (shirt.price || 0), 0);
  const lastShirt = filteredShirts[0];

  // Data for charts
  const shirtsByTeam = filteredShirts.reduce((acc, shirt) => {
    acc[shirt.team] = (acc[shirt.team] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const teamDataFull = Object.entries(shirtsByTeam)
    .map(([name, value]) => ({ name, value: value as number }))
    .sort((a, b) => b.value - a.value);
  const teamData = teamDataFull.slice(0, 5);

  const shirtsByBrand = filteredShirts.reduce((acc, shirt) => {
    acc[shirt.brand] = (acc[shirt.brand] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const totalBrands = Object.values(shirtsByBrand).reduce((a, b) => a + b, 0);
  const brandDataFull = Object.entries(shirtsByBrand)
    .map(([name, value]) => ({ 
      name, 
      value: value as number,
      percentage: totalBrands > 0 ? Number(((value as number / totalBrands) * 100).toFixed(1)) : 0
    }))
    .sort((a, b) => b.value - a.value);
  const brandData = brandDataFull.slice(0, 5);

  const shirtsByYear = filteredShirts.reduce((acc, shirt) => {
    if (shirt.purchaseDate) {
      const year = new Date(shirt.purchaseDate).getFullYear().toString();
      acc[year] = (acc[year] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  const yearDataFull = Object.entries(shirtsByYear)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const yearData = yearDataFull.slice(-5);

  const spendingByYear = filteredShirts.reduce((acc, shirt) => {
    if (shirt.purchaseDate && shirt.price) {
      const year = new Date(shirt.purchaseDate).getFullYear().toString();
      if (!acc[year]) {
        acc[year] = { total: 0, count: 0 };
      }
      acc[year].total += shirt.price;
      acc[year].count += 1;
    }
    return acc;
  }, {} as Record<string, { total: number, count: number }>);

  const totalSpendingByYearDataFull = Object.entries(spendingByYear)
    .map(([name, data]) => ({
      name,
      total: Number(data.total.toFixed(2))
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const totalSpendingByYearData = totalSpendingByYearDataFull.slice(-5);

  // Evolution over time (cumulative count by purchase date)
  const sortedByDate = [...filteredShirts]
    .filter(s => s.purchaseDate)
    .sort((a, b) => new Date(a.purchaseDate!).getTime() - new Date(b.purchaseDate!).getTime());
  
  let cumulativeCount = 0;
  const evolutionData = sortedByDate.map(shirt => {
    cumulativeCount++;
    return {
      date: shirt.purchaseDate,
      count: cumulativeCount
    };
  });

  // Types
  const shirtsByType = filteredShirts.reduce((acc, shirt) => {
    acc[shirt.type] = (acc[shirt.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const typeDataFull = Object.entries(shirtsByType)
    .map(([name, value]) => ({ name, value: value as number }))
    .sort((a, b) => b.value - a.value);
  const typeData = typeDataFull.slice(0, 5);

  // Locations
  const shirtsByLocation = filteredShirts.reduce((acc, shirt) => {
    if (shirt.purchaseLocation && shirt.purchaseLocation.trim() !== '') {
      const loc = shirt.purchaseLocation.trim();
      acc[loc] = (acc[loc] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  const locationDataFull = Object.entries(shirtsByLocation)
    .map(([name, value]) => ({ name, value: value as number }))
    .sort((a, b) => b.value - a.value);
  const locationData = locationDataFull.slice(0, 5);

  // Top 5 Most Expensive Shirts
  const topExpensiveShirtsFull = [...filteredShirts]
    .filter(shirt => shirt.price && shirt.price > 0)
    .sort((a, b) => (b.price || 0) - (a.price || 0))
    .map((shirt, index) => ({
      name: `${shirt.team} ${shirt.season}${"\u200B".repeat(index)}`,
      cleanName: `${shirt.team} ${shirt.season}`,
      price: shirt.price,
      imageUrl: shirt.imageUrls && shirt.imageUrls.length > 0 ? shirt.imageUrls[0] : null,
      imageBgColor: shirt.imageBgColor || '#FFFFFF'
    }));
  const topExpensiveShirts = topExpensiveShirtsFull.slice(0, 5);

  const CustomExpensiveTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border border-border bg-card p-3 shadow-md z-50 min-w-[120px]">
          {data.imageUrl ? (
            <div 
              className="mb-3 flex h-24 w-full items-center justify-center overflow-hidden rounded-md"
              style={{ backgroundColor: data.imageBgColor }}
            >
              <img
                src={data.imageUrl}
                alt={data.cleanName}
                className="h-full w-full object-contain"
              />
            </div>
          ) : (
            <div className="mb-3 flex h-24 w-full items-center justify-center rounded-md bg-muted">
              <span className="text-xs text-muted-foreground">Sem imagem</span>
            </div>
          )}
          <p className="font-medium text-foreground text-sm mb-1">{data.cleanName}</p>
          <p className="font-bold text-primary text-sm">R$ {data.price}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 items-end">
        <h1 className="text-3xl font-bold text-foreground md:col-span-2">Dashboard</h1>
        
        <div className="w-full">
          <Popover open={teamOpen} onOpenChange={setTeamOpen}>
            <PopoverTrigger
              className={cn(buttonVariants({ variant: "outline" }), "w-full justify-between font-normal h-10")}
              role="combobox"
            >
              {selectedTeam === 'all'
                ? "Todos os Times"
                : uniqueTeams.find((team) => team === selectedTeam) || "Todos os Times"}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </PopoverTrigger>
            <PopoverContent className="w-[--anchor-width] min-w-48 p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar time..." />
                <CommandList>
                  <CommandEmpty>Nenhum time encontrado.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="all"
                      onSelect={() => {
                        setSelectedTeam('all');
                        setTeamOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedTeam === 'all' ? "opacity-100" : "opacity-0"
                        )}
                      />
                      Todos os Times
                    </CommandItem>
                    {uniqueTeams.map((team) => (
                      <CommandItem
                        key={team}
                        value={team}
                        onSelect={() => {
                          setSelectedTeam(team);
                          setTeamOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedTeam === team ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {team}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        
        <div className="w-full">
          <Select value={selectedPurchaseYear} onValueChange={setSelectedPurchaseYear}>
            <SelectTrigger className="w-full font-normal">
              <span>{selectedPurchaseYear === 'all' ? "Todos os Anos" : selectedPurchaseYear}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Anos</SelectItem>
              {uniquePurchaseYears.map(year => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mb-8 grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Camisas</CardTitle>
            <ShirtIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalShirts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Wishlist</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalWishlist}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Valor Investido</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalInvested)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Última Aquisição</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">
              {lastShirt ? lastShirt.team : 'Nenhuma'}
            </div>
            {lastShirt && (
              <p className="text-xs text-muted-foreground">{lastShirt.season}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Camisas por Time</CardTitle>
            <Dialog>
              <DialogTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>Ver Tudo</DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Todas as Camisas por Time</DialogTitle>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto space-y-4 pt-4 pr-2">
                  {teamDataFull.map((item, i) => (
                    <div key={i} className="flex justify-between items-center border-b pb-2 last:border-0">
                      <span className="font-medium text-sm">{item.name}</span>
                      <span className="text-muted-foreground text-sm">{item.value} camisas</span>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="h-[300px]">
            {teamData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={teamData} layout="vertical" margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                  <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" width={85} stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{ fill: 'var(--muted)' }} 
                    contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                    itemStyle={{ color: 'var(--foreground)' }}
                    formatter={(value: any) => [value, 'Quantidade']} 
                  />
                  <Bar dataKey="value" fill="currentColor" className="fill-primary" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">Sem dados</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Distribuição por Marca</CardTitle>
            <Dialog>
              <DialogTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>Ver Tudo</DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Todas as Marcas</DialogTitle>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto space-y-4 pt-4 pr-2">
                  {brandDataFull.map((item, i) => (
                    <div key={i} className="flex justify-between items-center border-b pb-2 last:border-0">
                      <span className="font-medium text-sm">{item.name}</span>
                      <span className="text-muted-foreground text-sm">{item.value} camisas ({item.percentage}%)</span>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="h-[300px]">
            {brandData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={brandData} layout={isMobile ? "vertical" : "horizontal"} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={!isMobile} vertical={isMobile} stroke="var(--border)" />
                  {isMobile ? (
                    <>
                      <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis dataKey="name" type="category" width={80} stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                    </>
                  ) : (
                    <>
                      <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} width={30} stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                    </>
                  )}
                  <Tooltip 
                    cursor={{ fill: 'var(--muted)' }} 
                    contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                    itemStyle={{ color: 'var(--foreground)' }}
                    formatter={(value: any) => [value, 'Quantidade']} 
                  />
                  <Bar dataKey="value" fill="currentColor" className="fill-primary" radius={isMobile ? [0, 4, 4, 0] : [4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">Sem dados</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Aquisições por Ano</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {yearData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={yearData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} width={30} stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{ stroke: 'var(--muted)', strokeWidth: 2 }} 
                    contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                    itemStyle={{ color: 'var(--foreground)' }}
                    formatter={(value: any) => [value, 'Quantidade']} 
                  />
                  <Line type="monotone" dataKey="value" stroke="currentColor" className="stroke-primary" strokeWidth={2} dot={{ r: 4, fill: "currentColor", className: "fill-primary" }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">Sem dados</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Total Gasto por Ano</CardTitle>
            <Dialog>
              <DialogTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>Ver Tudo</DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Total Gasto por Ano</DialogTitle>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto space-y-4 pt-4 pr-2">
                  {[...totalSpendingByYearDataFull].reverse().map((item, i) => (
                    <div key={i} className="flex justify-between items-center border-b pb-2 last:border-0">
                      <span className="font-medium text-sm">{item.name}</span>
                      <span className="text-muted-foreground text-sm">R$ {item.total.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="h-[300px]">
            {totalSpendingByYearData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={totalSpendingByYearData} layout={isMobile ? "vertical" : "horizontal"} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={!isMobile} vertical={isMobile} stroke="var(--border)" />
                  {isMobile ? (
                    <>
                      <XAxis type="number" tick={<CustomCurrencyTick isXAxis={true} />} stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis dataKey="name" type="category" width={40} stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                    </>
                  ) : (
                    <>
                      <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis tick={<CustomCurrencyTick isXAxis={false} />} width={45} stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                    </>
                  )}
                  <Tooltip 
                    cursor={{ fill: 'var(--muted)' }} 
                    contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                    itemStyle={{ color: 'var(--foreground)' }}
                    formatter={(value: any) => [`R$ ${value}`, 'Total']} 
                  />
                  <Bar dataKey="total" fill="currentColor" className="fill-primary" radius={isMobile ? [0, 4, 4, 0] : [4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">Sem dados</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Evolução da Coleção</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {evolutionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evolutionData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="date" tickFormatter={(val) => new Date(val).getFullYear().toString()} stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis width={30} stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{ stroke: 'var(--muted)', strokeWidth: 2 }} 
                    contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                    itemStyle={{ color: 'var(--foreground)' }}
                    labelFormatter={(val) => new Date(val).toLocaleDateString('pt-BR')} 
                    formatter={(value: any) => [value, 'Quantidade']} 
                  />
                  <Line type="stepAfter" dataKey="count" stroke="currentColor" className="stroke-primary" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">Sem dados de compra</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Tipos de Camisa</CardTitle>
            <Dialog>
              <DialogTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>Ver Tudo</DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Todos os Tipos</DialogTitle>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto space-y-4 pt-4 pr-2">
                  {typeDataFull.map((item, i) => (
                    <div key={i} className="flex justify-between items-center border-b pb-2 last:border-0">
                      <span className="font-medium text-sm">{item.name}</span>
                      <span className="text-muted-foreground text-sm">{item.value} camisas</span>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="h-[300px]">
            {typeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeData} layout="vertical" margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                  <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" width={85} stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{ fill: 'var(--muted)' }} 
                    contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                    itemStyle={{ color: 'var(--foreground)' }}
                    formatter={(value: any) => [value, 'Quantidade']} 
                  />
                  <Bar dataKey="value" fill="currentColor" className="fill-primary" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">Sem dados</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Locais de Compra</CardTitle>
            <Dialog>
              <DialogTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>Ver Tudo</DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Locais de Compra</DialogTitle>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto space-y-4 pt-4 pr-2">
                  {locationDataFull.map((item, i) => (
                    <div key={i} className="flex justify-between items-center border-b pb-2 last:border-0">
                      <span className="font-medium text-sm">{item.name}</span>
                      <span className="text-muted-foreground text-sm">{item.value} compras</span>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="h-[300px]">
            {locationData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={locationData} layout="vertical" margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                  <XAxis type="number" allowDecimals={false} stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" width={80} stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{ fill: 'var(--muted)' }} 
                    contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                    itemStyle={{ color: 'var(--foreground)' }}
                    formatter={(value: any) => [value, 'Quantidade']} 
                  />
                  <Bar dataKey="value" fill="currentColor" className="fill-primary" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">Sem dados</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Camisas Mais Caras</CardTitle>
            <Dialog>
              <DialogTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>Ver Tudo</DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ranking de Valores</DialogTitle>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto space-y-4 pt-4 pr-2">
                  {topExpensiveShirtsFull.map((item, i) => (
                    <div key={i} className="flex justify-between items-center border-b pb-2 last:border-0">
                      <span className="font-medium text-sm">{i + 1}º - {item.cleanName}</span>
                      <span className="text-muted-foreground text-sm">R$ {item.price?.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="h-[300px]">
            {topExpensiveShirts.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topExpensiveShirts} layout="vertical" margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                  <XAxis type="number" tick={<CustomCurrencyTick isXAxis={true} />} stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" width={90} stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{ fill: 'var(--muted)' }} 
                    content={<CustomExpensiveTooltip />}
                  />
                  <Bar dataKey="price" fill="currentColor" className="fill-primary" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">Sem dados</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
