import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, setDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { WishlistShirt, OperationType } from '../types';
import { handleFirestoreError } from '../lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { ArrowLeft, Upload, X } from 'lucide-react';

const wishlistSchema = z.object({
  team: z.string().min(1, 'Time é obrigatório').max(100),
  season: z.string().min(1, 'Temporada é obrigatória').max(50),
  type: z.string().min(1, 'Tipo é obrigatório').max(50),
  brand: z.string().min(1, 'Marca é obrigatória').max(50),
  notes: z.string().max(1000).optional(),
  imageUrls: z.array(z.string()).max(2).optional(),
  imageBgColor: z.string().optional(),
});

type WishlistFormData = z.infer<typeof wishlistSchema>;

const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

export function WishlistForm() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(id ? true : false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const isEdit = !!id;

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<WishlistFormData>({
    resolver: zodResolver(wishlistSchema) as any,
    defaultValues: {
      team: '',
      season: '',
      type: '',
      brand: '',
      notes: '',
      imageBgColor: '#FFFFFF',
    }
  });

  useEffect(() => {
    if (!id || !user) return;

    const fetchShirt = async () => {
      try {
        const docRef = doc(db, 'wishlist', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data() as WishlistShirt;
          if (data.userId !== user.uid) {
            navigate('/wishlist');
            return;
          }
          
          if (data.imageUrls) {
            setExistingImages(data.imageUrls);
          }
          
          Object.keys(data).forEach((key) => {
            if (key !== 'id' && key !== 'userId' && key !== 'createdAt') {
              setValue(key as keyof WishlistFormData, data[key as keyof WishlistFormData]);
            }
          });
        } else {
          navigate('/wishlist');
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `wishlist/${id}`);
      } finally {
        setLoading(false);
      }
    };

    fetchShirt();
  }, [id, user, navigate, setValue]);

  const onSubmit = async (data: WishlistFormData) => {
    if (!user) return;
    setSaving(true);

    try {
      let uploadedUrls: string[] = [...existingImages];

      if (imageFiles.length > 0) {
        for (const file of imageFiles) {
          try {
            const base64Url = await compressImage(file);
            uploadedUrls.push(base64Url);
          } catch (err) {
            console.error("Error compressing image:", err);
            throw new Error("Falha ao processar a imagem. Tente uma imagem diferente.");
          }
        }
      }

      const shirtData = {
        ...data,
        imageUrls: uploadedUrls,
        userId: user.uid,
      };

      const cleanData = Object.fromEntries(
        Object.entries(shirtData).filter(([_, v]) => v !== undefined)
      );

      if (isEdit && id) {
        const docRef = doc(db, 'wishlist', id);
        const docSnap = await getDoc(docRef);
        const existingData = docSnap.data();
        
        await setDoc(docRef, {
          ...cleanData,
          createdAt: existingData?.createdAt || Date.now(),
        });
      } else {
        await addDoc(collection(db, 'wishlist'), {
          ...cleanData,
          createdAt: Date.now(),
        });
      }
      navigate('/wishlist');
    } catch (error: any) {
      setSaving(false);
      console.error("Upload/Save error:", error);
      
      if (error instanceof Error && error.message.includes('1048576')) {
        setErrorMsg("A imagem é muito grande para ser salva. Tente uma imagem com tamanho menor.");
      } else {
        setErrorMsg(error instanceof Error ? error.message : String(error));
      }
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-foreground border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar
      </button>

      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? 'Editar Desejo' : 'Novo Desejo'}</CardTitle>
        </CardHeader>
        <CardContent>
          {errorMsg && (
            <div className="mb-6 rounded-md bg-red-50 p-4 text-sm text-red-700">
              <p className="font-bold">Erro ao salvar:</p>
              <p className="whitespace-pre-wrap font-mono text-xs mt-1">{errorMsg}</p>
            </div>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="team">Time *</Label>
                <Input id="team" {...register('team')} placeholder="Ex: Milan" />
                {errors.team && <p className="text-xs text-red-500">{errors.team.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="season">Temporada *</Label>
                <Input id="season" {...register('season')} placeholder="Ex: 2006/07" />
                {errors.season && <p className="text-xs text-red-500">{errors.season.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Tipo *</Label>
                <Select onValueChange={(val) => setValue('type', val)} value={watch('type') || ''}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Titular">Titular (Home)</SelectItem>
                    <SelectItem value="Reserva">Reserva (Away)</SelectItem>
                    <SelectItem value="Alternativa">Alternativa (Third)</SelectItem>
                    <SelectItem value="Goleiro">Goleiro</SelectItem>
                    <SelectItem value="Treino">Treino</SelectItem>
                    <SelectItem value="Comemorativa">Comemorativa</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
                {errors.type && <p className="text-xs text-red-500">{errors.type.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand">Marca *</Label>
                <Input id="brand" {...register('brand')} placeholder="Ex: Adidas, Nike" />
                {errors.brand && <p className="text-xs text-red-500">{errors.brand.message}</p>}
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Imagens (Máximo 2, PNG ou JPEG)</Label>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/50">
                      <Upload size={16} />
                      <span>Selecionar Imagens</span>
                      <input
                        type="file"
                        accept="image/png, image/jpeg"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files) {
                            const newFiles = Array.from(e.target.files);
                            const totalImages = existingImages.length + imageFiles.length + newFiles.length;
                            if (totalImages > 2) {
                              alert('Você pode adicionar no máximo 2 imagens.');
                              return;
                            }
                            setImageFiles([...imageFiles, ...newFiles]);
                          }
                        }}
                      />
                    </label>
                    <span className="text-xs text-muted-foreground">
                      {existingImages.length + imageFiles.length} de 2 imagens
                    </span>
                  </div>
                  
                  {(existingImages.length > 0 || imageFiles.length > 0) && (
                    <div className="flex flex-wrap gap-4">
                      {existingImages.map((url, index) => (
                        <div 
                          key={`existing-${index}`} 
                          className="relative h-24 w-24 overflow-hidden rounded-md border border-border"
                          style={{ backgroundColor: watch('imageBgColor') || '#FFFFFF' }}
                        >
                          <img src={url} alt="Camisa" className="h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setExistingImages(existingImages.filter((_, i) => i !== index))}
                            className="absolute right-1 top-1 rounded-full bg-card/80 p-1 text-red-600 hover:bg-card"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                      {imageFiles.map((file, index) => (
                        <div 
                          key={`new-${index}`}
                          className="relative h-24 w-24 overflow-hidden rounded-md border border-border"
                          style={{ backgroundColor: watch('imageBgColor') || '#FFFFFF' }}
                        >
                          <img src={URL.createObjectURL(file)} alt="Nova Camisa" className="h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setImageFiles(imageFiles.filter((_, i) => i !== index))}
                            className="absolute right-1 top-1 rounded-full bg-card/80 p-1 text-red-600 hover:bg-card"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="imageBgColor">Cor de Fundo da Imagem (Exibição)</Label>
                <div className="flex items-center gap-3">
                  <div 
                    className="relative flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-border bg-white shadow-sm"
                    style={{ backgroundColor: watch('imageBgColor') || '#FFFFFF' }}
                  >
                    <input
                      type="color"
                      value={(/^#[0-9A-Fa-f]{6}$/i.test(watch('imageBgColor') || '')) ? watch('imageBgColor') : '#ffffff'}
                      onChange={(e) => setValue('imageBgColor', e.target.value)}
                      className="absolute inset-0 h-[200%] w-[200%] -translate-x-[25%] -translate-y-[25%] cursor-pointer opacity-0"
                      title="Escolher cor visualmente"
                    />
                  </div>
                  <Input 
                    id="imageBgColor"
                    {...register('imageBgColor')} 
                    placeholder="Ex: #FFFFFF ou rgb(248, 248, 248)" 
                    className="w-full sm:max-w-md font-mono text-sm"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Clique no quadrado colorido para abrir a paleta, ou digite o código da cor no formato HEX ou RGB.
                </p>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes">Dados Históricos</Label>
                <Textarea id="notes" {...register('notes')} placeholder="Detalhes históricos ou adicionais..." />
              </div>
            </div>

            <div className="flex justify-end gap-4 border-t border-border pt-6">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background shadow hover:bg-foreground/90 disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar Desejo'}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
