import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Shirt, OperationType } from '../types';
import { handleFirestoreError } from '../lib/utils';
import { ArrowLeft, Edit, Trash2, Heart, Shirt as ShirtIcon } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';

export function ShirtDetails() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [shirt, setShirt] = useState<Shirt | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [mainImageIndex, setMainImageIndex] = useState(0);

  useEffect(() => {
    if (!id || !user) return;

    const fetchShirt = async () => {
      try {
        const docRef = doc(db, 'shirts', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data() as Shirt;
          if (data.userId !== user.uid) {
            navigate('/collection');
            return;
          }
          setShirt({ id: docSnap.id, ...data });
        } else {
          navigate('/collection');
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `shirts/${id}`);
      } finally {
        setLoading(false);
      }
    };

    fetchShirt();
  }, [id, user, navigate]);

  const handleDelete = async () => {
    if (!id || !user) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'shirts', id));
      navigate('/collection');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `shirts/${id}`);
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-foreground border-t-transparent"></div>
      </div>
    );
  }

  if (!shirt) return null;

  return (
    <div className="mx-auto max-w-5xl p-8">
      <button
        onClick={() => navigate('/collection')}
        className="mb-6 flex items-center text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar para Coleção
      </button>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Image Section */}
        <div className="flex flex-col gap-4">
          <div 
            className="overflow-hidden rounded-xl shadow-sm aspect-square"
            style={{ backgroundColor: shirt.imageBgColor || '#FFFFFF' }}
          >
            {shirt.imageUrls && shirt.imageUrls.length > 0 ? (
              <img
                src={shirt.imageUrls[mainImageIndex]}
                alt={`${shirt.team} ${shirt.season}`}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <ShirtIcon className="h-32 w-32 text-muted-foreground" />
              </div>
            )}
          </div>
          {shirt.imageUrls && shirt.imageUrls.length > 1 && (
            <div className="grid grid-cols-3 gap-4">
              {shirt.imageUrls.map((url, index) => (
                <button
                  key={index}
                  onClick={() => setMainImageIndex(index)}
                  className={`overflow-hidden rounded-xl shadow-sm aspect-square border-2 transition-all ${
                    mainImageIndex === index ? 'border-foreground opacity-100' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: shirt.imageBgColor || '#FFFFFF' }}
                >
                  <img
                    src={url}
                    alt={`${shirt.team} ${shirt.season} - Imagem ${index + 1}`}
                    className="h-full w-full object-contain"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details Section */}
        <div className="flex flex-col">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <h1 className="text-4xl font-bold text-foreground">{shirt.team}</h1>
                {shirt.isFavorite && <Heart className="h-6 w-6 fill-red-500 text-red-500" />}
              </div>
              <p className="text-xl text-muted-foreground">{shirt.season} • {shirt.type}</p>
            </div>
            <div className="flex gap-2">
              <Link
                to={`/collection/${shirt.id}/edit`}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
              >
                <Edit size={18} />
              </Link>
              
              <Dialog>
                <DialogTrigger className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600 transition-colors hover:bg-red-100 hover:text-red-700">
                  <Trash2 size={18} />
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Excluir Camisa</DialogTitle>
                    <DialogDescription>
                      Tem certeza que deseja excluir esta camisa da sua coleção? Esta ação não pode ser desfeita.
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
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {isDeleting ? 'Excluindo...' : 'Excluir'}
                    </button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="mb-6 flex flex-wrap gap-2">
            <Badge variant="secondary">{shirt.brand}</Badge>
            <Badge variant="outline">Tamanho: {shirt.size}</Badge>
            <Badge variant="outline">Condição: {shirt.condition}</Badge>
            {shirt.autographed && <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Autografada</Badge>}
            {shirt.isCustomized && <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Personalizada</Badge>}
          </div>

          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Valor Pago</p>
                  <p className="text-lg font-bold text-foreground">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(shirt.price)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Data de Compra</p>
                  <p className="text-base text-foreground">
                    {shirt.purchaseDate ? new Date(shirt.purchaseDate).toLocaleDateString('pt-BR') : 'Não informada'}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Local de Compra</p>
                  <p className="text-base text-foreground">{shirt.purchaseLocation || 'Não informado'}</p>
                </div>
                {shirt.autographed && shirt.autographDetails && (
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-muted-foreground">Autografada por</p>
                    <p className="text-base font-medium text-foreground">{shirt.autographDetails}</p>
                  </div>
                )}
                {shirt.isCustomized && shirt.customizationDetails && (
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-muted-foreground">Personalização</p>
                    <p className="text-base font-medium text-foreground">{shirt.customizationDetails}</p>
                  </div>
                )}
                {shirt.authenticityTag && (
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-muted-foreground">Etiqueta de Autenticidade</p>
                    <p className="text-base text-foreground">{shirt.authenticityTag}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {shirt.notes && (
            <div>
              <h3 className="mb-2 text-lg font-bold text-foreground">Dados Históricos</h3>
              <p className="whitespace-pre-wrap rounded-lg bg-muted/50 p-4 text-muted-foreground">
                {shirt.notes}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
