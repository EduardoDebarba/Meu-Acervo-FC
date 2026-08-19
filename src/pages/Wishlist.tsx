import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy, doc, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { WishlistShirt, OperationType } from '../types';
import { handleFirestoreError } from '../lib/utils';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, ExternalLink, ArrowRight, Trash2, Edit } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';

export function Wishlist() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [shirts, setShirts] = useState<WishlistShirt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'wishlist'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as WishlistShirt[];
      setShirts(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'wishlist');
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'wishlist', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `wishlist/${id}`);
    }
  };

  const handleMoveToCollection = async (shirt: WishlistShirt) => {
    if (!user) return;
    try {
      // Add to collection
      const newShirtData = {
        userId: user.uid,
        team: shirt.team,
        season: shirt.season,
        type: shirt.type,
        brand: shirt.brand,
        size: 'M', // Default size, user can edit later
        condition: 'Nova', // Default condition
        price: 0, // Default price
        purchaseDate: new Date().toISOString().split('T')[0],
        notes: shirt.notes || '',
        imageUrls: shirt.imageUrls || [],
        createdAt: Date.now(),
      };
      
      const newDoc = await addDoc(collection(db, 'shirts'), newShirtData);
      
      // Delete from wishlist
      if (shirt.id) {
        await deleteDoc(doc(db, 'wishlist', shirt.id));
      }
      
      // Navigate to edit the new shirt to fill missing details
      navigate(`/collection/${newDoc.id}/edit`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'shirts/wishlist');
    }
  };

  const filteredShirts = shirts.filter(shirt => {
    const matchesSearch = shirt.team.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          shirt.season.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

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
        <h1 className="text-3xl font-bold text-foreground">Wishlist</h1>
        <Link
          to="/wishlist/new"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background shadow hover:bg-foreground/90"
        >
          <Plus size={16} />
          Adicionar Desejo
        </Link>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por time ou temporada..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {filteredShirts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12">
          <h3 className="mb-1 text-lg font-medium text-foreground">Nenhuma camisa na wishlist</h3>
          <p className="text-sm text-muted-foreground">
            {searchTerm ? 'Tente ajustar os filtros.' : 'Adicione camisas que você deseja comprar no futuro.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredShirts.map((shirt) => (
            <Card key={shirt.id} className="flex flex-col overflow-hidden transition-all hover:shadow-md">
              <div 
                className="aspect-square w-full overflow-hidden"
                style={{ backgroundColor: shirt.imageBgColor || '#FFFFFF' }}
              >
                {shirt.imageUrls && shirt.imageUrls.length > 0 ? (
                  <img
                    src={shirt.imageUrls[0]}
                    alt={`${shirt.team} ${shirt.season}`}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-muted/80">
                    <span className="text-muted-foreground">Sem imagem</span>
                  </div>
                )}
              </div>
              <CardContent className="flex flex-1 flex-col p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="font-bold text-foreground line-clamp-1">{shirt.team}</h3>
                </div>
                <p className="mb-4 text-sm text-muted-foreground">{shirt.season} • {shirt.type}</p>
                
                <div className="mt-auto space-y-4">
                  <div className="flex items-center justify-between border-t border-border pt-4">
                    <div className="flex gap-2">
                      <Link
                        to={`/wishlist/${shirt.id}/edit`}
                        className="p-2 text-muted-foreground hover:text-foreground"
                        title="Editar"
                      >
                        <Edit size={16} />
                      </Link>
                      <Dialog>
                        <DialogTrigger className="p-2 text-muted-foreground hover:text-red-600" title="Excluir">
                          <Trash2 size={16} />
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Excluir da Wishlist</DialogTitle>
                            <DialogDescription>
                              Tem certeza que deseja remover esta camisa da sua wishlist?
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <button
                              className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
                              onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))}
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => shirt.id && handleDelete(shirt.id)}
                              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                            >
                              Excluir
                            </button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                    
                    <button
                      onClick={() => handleMoveToCollection(shirt)}
                      className="flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/80"
                      title="Adicionar à coleção"
                    >
                      Comprei <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
