'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useInventory } from '@/hooks/use-inventory';
import { useToast } from '@/hooks/use-toast';
import type { Employee } from '@/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn, formatToWIB } from '@/lib/utils';

const formSchema = z.object({
  id: z.number().optional(),
  fullName: z.string().min(2, 'Nama lengkap harus diisi.'),
  nikKependudukan: z.string().optional().default(''),
  nikPekerja: z.string().optional().default(''),
  division: z.string().optional().default(''),
  position: z.string().optional().default(''),
  address: z.string().optional().default(''),
  startDate: z.date().optional(),
  username: z.string().min(3, 'Username minimal 3 karakter.'),
  password: z.string().optional(),
}).refine(data => {
  // Logic: Password wajib untuk user baru, minimal 6 karakter jika diisi
  if (!data.id && (!data.password || data.password.length < 6)) {
    return false;
  }
  if (data.id && data.password && data.password.length > 0 && data.password.length < 6) {
    return false;
  }
  return true;
}, {
  message: "Password minimal 6 karakter.",
  path: ["password"],
});

interface EmployeeFormDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  employee: Employee | null;
}

export function EmployeeFormDialog({ isOpen, setIsOpen, employee }: EmployeeFormDialogProps) {
  const { addEmployee, updateEmployee } = useInventory();
  const { toast } = useToast();
  const isEditMode = !!employee;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: '',
      username: '',
      password: '',
      nikKependudukan: '',
      nikPekerja: '',
      division: '',
      position: '',
      address: '',
    }
  });

  const { reset } = form;

  useEffect(() => {
    if (isOpen) {
      reset({
        id: employee?.id,
        fullName: employee?.fullName || '',
        nikKependudukan: employee?.nikKependudukan || '',
        nikPekerja: employee?.nikPekerja || '',
        division: employee?.division || '',
        position: employee?.position || '',
        address: employee?.address || '',
        startDate: employee?.startDate ? new Date(employee.startDate) : undefined,
        username: employee?.username || '',
        password: '', // Selalu kosongkan field password saat buka dialog
      });
    }
  }, [isOpen, employee, reset]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const payload: any = {
        ...values,
        startDate: values.startDate ? values.startDate.toISOString() : undefined,
      };

      // Hapus password jika kosong (khusus edit mode agar tidak nimpa password lama dengan string kosong)
      if (isEditMode && !values.password) {
        delete payload.password;
      }

      if (isEditMode && values.id) {
        await updateEmployee(values.id, payload);
        toast({ title: 'Berhasil', description: 'Data karyawan diperbarui' });
      } else {
        await addEmployee(payload);
        toast({ title: 'Berhasil', description: 'Karyawan baru ditambahkan' });
      }
      setIsOpen(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Gagal Menyimpan',
        description: error.message || 'Terjadi kesalahan sistem',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Ubah Data Karyawan' : 'Tambah Karyawan Baru'}</DialogTitle>
          <DialogDescription>Lengkapi detail karyawan di bawah ini.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4 py-2">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Lengkap</FormLabel>
                      <FormControl><Input placeholder="Contoh: Budi Santoso" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="nikKependudukan"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>NIK Kependudukan</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nikPekerja"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>NIK Pekerja</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="division"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Divisi</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="position"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jabatan</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alamat</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Tanggal Masuk Kerja</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                            >
                              {field.value ? formatToWIB(field.value, 'PPP') : <span>Pilih tanggal</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar 
                            mode="single" 
                            selected={field.value} 
                            onSelect={field.onChange} 
                            disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                            initialFocus 
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="border-t pt-6 mt-6 space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground">Akun Pengguna</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input {...field} disabled={isEditMode} autoComplete="off" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{isEditMode ? 'Password Baru (Opsional)' : 'Password'}</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} autoComplete="new-password" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
            </ScrollArea>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
