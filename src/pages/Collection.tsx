import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Shirt, OperationType } from '../types';
import { handleFirestoreError } from '../lib/utils';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, Shirt as ShirtIcon } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

export function Collection() {
  const { user } = useAuth();
  const [shirts, setShirts] = useState<Shirt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'shirts'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
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

    return unsubscribe;
  }, [user]);

  const filteredAndSortedShirts = shirts
    .filter(shirt => 
      shirt.team.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shirt.season.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shirt.brand.toLowerCase().includes(searchTerm.toLowerCase())
    );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-foreground border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-foreground">Minha Coleção</h1>
        <Link
          to="/collection/new"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background shadow hover:bg-foreground/90"
        >
          <Plus size={16} />
          Adicionar Camisa
        </Link>
      </div>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por time, temporada ou marca..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {filteredAndSortedShirts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12">
          <ShirtIcon className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-1 text-lg font-medium text-foreground">Nenhuma camisa encontrada</h3>
          <p className="text-sm text-muted-foreground">
            {searchTerm ? 'Tente ajustar os filtros de busca.' : 'Comece adicionando sua primeira camisa!'}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredAndSortedShirts.map((shirt) => (
            <Link key={shirt.id} to={`/collection/${shirt.id}`}>
              <Card className="group overflow-hidden transition-all hover:shadow-md">
                <div 
                  className="aspect-square w-full overflow-hidden" 
                  style={{ backgroundColor: shirt.imageBgColor || '#FFFFFF' }}
                >
                  {shirt.imageUrls && shirt.imageUrls.length > 0 ? (
                    <img
                      src={shirt.imageUrls[0]}
                      alt={`${shirt.team} ${shirt.season}`}
                      className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <ShirtIcon className="h-16 w-16 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <h3 className="font-bold text-foreground line-clamp-1">{shirt.team}</h3>
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {shirt.season}
                    </span>
                  </div>
                  <p className="mb-2 text-sm text-muted-foreground">{shirt.brand} • {shirt.type}</p>
                  <p className="font-medium text-foreground">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(shirt.price)}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
