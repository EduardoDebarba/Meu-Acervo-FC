import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, setDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Shirt, OperationType } from '../types';
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

const shirtSchema = z.object({
  team: z.string().min(1, 'Time é obrigatório').max(100),
  season: z.string().min(1, 'Temporada é obrigatória').max(50),
  type: z.string().min(1, 'Tipo é obrigatório').max(50),
  brand: z.string().min(1, 'Marca é obrigatória').max(50),
  size: z.string().min(1, 'Tamanho é obrigatório').max(20),
  condition: z.string().min(1, 'Condição é obrigatória').max(50),
  price: z.coerce.number().min(0, 'Preço deve ser maior ou igual a 0'),
  purchaseDate: z.string().max(50).optional(),
  purchaseLocation: z.string().max(100).optional(),
  authenticityTag: z.string().max(100).optional(),
  autographed: z.boolean().optional(),
  autographDetails: z.string().max(100).optional(),
  isCustomized: z.boolean().optional(),
  customizationDetails: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
  imageUrls: z.array(z.string()).max(3).optional(),
  imageBgColor: z.string().optional(),
  isFavorite: z.boolean().optional(),
});

type ShirtFormData = z.infer<typeof shirtSchema>;

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

export function ShirtForm() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(id ? true : false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const isEdit = !!id;

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ShirtFormData>({
    resolver: zodResolver(shirtSchema) as any,
    defaultValues: {
      team: '',
      season: '',
      type: '',
      brand: '',
      size: '',
      condition: '',
      price: 0,
      purchaseDate: '',
      purchaseLocation: '',
      authenticityTag: '',
      autographed: false,
      autographDetails: '',
      isCustomized: false,
      customizationDetails: '',
      notes: '',
      imageBgColor: '#FFFFFF',
      isFavorite: false,
    }
  });

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
          
          if (data.imageUrls) {
            setExistingImages(data.imageUrls);
          }
          
          Object.keys(data).forEach((key) => {
            if (key !== 'id' && key !== 'userId' && key !== 'createdAt') {
              setValue(key as keyof ShirtFormData, data[key as keyof ShirtFormData]);
            }
          });
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
  }, [id, user, navigate, setValue]);

  const onSubmit = async (data: ShirtFormData) => {
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
        const docRef = doc(db, 'shirts', id);
        const docSnap = await getDoc(docRef);
        const existingData = docSnap.data();
        
        await setDoc(docRef, {
          ...cleanData,
          createdAt: existingData?.createdAt || Date.now(),
        });
        navigate(`/collection/${id}`);
      } else {
        const newDoc = await addDoc(collection(db, 'shirts'), {
          ...cleanData,
          createdAt: Date.now(),
        });
        navigate(`/collection/${newDoc.id}`);
      }
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
          <CardTitle>{isEdit ? 'Editar Camisa' : 'Nova Camisa'}</CardTitle>
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
                <Input id="team" {...register('team')} placeholder="Ex: Real Madrid" />
                {errors.team && <p className="text-xs text-red-500">{errors.team.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="season">Temporada *</Label>
                <Input id="season" {...register('season')} placeholder="Ex: 2022/23" />
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
              <div className="space-y-2">
                <Label htmlFor="size">Tamanho *</Label>
                <Input id="size" {...register('size')} placeholder="Ex: M, G, XL" />
                {errors.size && <p className="text-xs text-red-500">{errors.size.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="condition">Condição *</Label>
                <Select onValueChange={(val) => setValue('condition', val)} value={watch('condition') || ''}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a condição" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Nova na etiqueta">Nova na etiqueta (BNWT)</SelectItem>
                    <SelectItem value="Excelente">Excelente</SelectItem>
                    <SelectItem value="Muito Boa">Muito Boa</SelectItem>
                    <SelectItem value="Boa">Boa</SelectItem>
                    <SelectItem value="Usada">Usada</SelectItem>
                  </SelectContent>
                </Select>
                {errors.condition && <p className="text-xs text-red-500">{errors.condition.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Valor Pago (R$) *</Label>
                <Input id="price" type="number" step="0.01" {...register('price')} placeholder="0.00" />
                {errors.price && <p className="text-xs text-red-500">{errors.price.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="purchaseDate">Data de Compra</Label>
                <Input id="purchaseDate" type="date" {...register('purchaseDate')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="purchaseLocation">Local de Compra</Label>
                <Input id="purchaseLocation" {...register('purchaseLocation')} placeholder="Ex: Loja Oficial, eBay" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="authenticityTag">Etiqueta de Autenticidade</Label>
                <Input id="authenticityTag" {...register('authenticityTag')} placeholder="Ex: 123456789" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Imagens (Máximo 3, PNG ou JPEG)</Label>
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
                            if (totalImages > 3) {
                              alert('Você pode adicionar no máximo 3 imagens.');
                              return;
                            }
                            setImageFiles([...imageFiles, ...newFiles]);
                          }
                        }}
                      />
                    </label>
                    <span className="text-xs text-muted-foreground">
                      {existingImages.length + imageFiles.length} de 3 imagens
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
              <div className="flex flex-col space-y-2 sm:col-span-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="autographed"
                    className="h-4 w-4 rounded border-border text-foreground focus:ring-ring"
                    {...register('autographed')}
                  />
                  <Label htmlFor="autographed" className="font-normal">Camisa autografada</Label>
                </div>
                {watch('autographed') && (
                  <div className="mt-2 pl-6">
                    <Label htmlFor="autographDetails" className="sr-only">Nome de quem autografou</Label>
                    <Input 
                      id="autographDetails" 
                      {...register('autographDetails')} 
                      placeholder="Ex: Pelé, Zico" 
                      className="max-w-md"
                    />
                    {errors.autographDetails && <p className="text-xs text-red-500 mt-1">{errors.autographDetails.message}</p>}
                  </div>
                )}
              </div>
              <div className="flex flex-col space-y-2 sm:col-span-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isCustomized"
                    className="h-4 w-4 rounded border-border text-foreground focus:ring-ring"
                    {...register('isCustomized')}
                  />
                  <Label htmlFor="isCustomized" className="font-normal">Camisa personalizada (Nome/Número)</Label>
                </div>
                {watch('isCustomized') && (
                  <div className="mt-2 pl-6">
                    <Label htmlFor="customizationDetails" className="sr-only">Detalhes da Personalização</Label>
                    <Input 
                      id="customizationDetails" 
                      {...register('customizationDetails')} 
                      placeholder="Ex: RONALDO 9" 
                      className="max-w-md"
                    />
                    {errors.customizationDetails && <p className="text-xs text-red-500 mt-1">{errors.customizationDetails.message}</p>}
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2 sm:col-span-2">
                <input
                  type="checkbox"
                  id="isFavorite"
                  className="h-4 w-4 rounded border-border text-foreground focus:ring-ring"
                  {...register('isFavorite')}
                />
                <Label htmlFor="isFavorite" className="font-normal">Marcar como favorita</Label>
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
                {saving ? 'Salvando...' : 'Salvar Camisa'}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
