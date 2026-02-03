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
import { CalendarIcon, User, IdCard, Briefcase, MapPin, Lock } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn, formatToWIB } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

const formSchema = z.object({
  id: z.number().optional(),
  fullName: z.string().min(2, 'Nama lengkap harus diisi.'),
  nikKependudukan: z.string().min(1, 'NIK Kependudukan wajib diisi'),
  nikPekerja: z.string().optional().default(''),
  division: z.string().optional().default(''),
  position: z.string().optional().default(''),
  address: z.string().optional().default(''),
  startDate: z.date().optional(),
  username: z.string().min(3, 'Username minimal 3 karakter.'),
  password: z.string().optional(),
}).refine(data => {
  if (!data.id && (!data.password || data.password.length < 6)) return false;
  if (data.id && data.password && data.password.length > 0 && data.password.length < 6) return false;
  return true;
}, {
  message: "Password minimal 6 karakter.",
  path: ["password"],
});

export function EmployeeFormDialog({ isOpen, setIsOpen, employee }: { isOpen: boolean; setIsOpen: (open: boolean) => void; employee: Employee | null }) {
  const { addEmployee, updateEmployee } = useInventory();
  const { toast } = useToast();
  const isEditMode = !!employee;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: '', username: '', password: '', nikKependudukan: '', nikPekerja: '', division: '', position: '', address: '',
    }
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        id: employee?.id,
        fullName: employee?.fullName || '',
        nikKependudukan: employee?.nikKependudukan || '',
        nikPekerja: employee?.nikPekerja || '',
        division: employee?.division || '',
        position: employee?.position || '',
        address: employee?.address || '',
        startDate: employee?.startDate ? new Date(employee.startDate) : undefined,
        username: employee?.username || '',
        password: '',
      });
    }
  }, [isOpen, employee, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const payload = { ...values, startDate: values.startDate?.toISOString() };
      if (isEditMode && !values.password) delete (payload as any).password;
      
      if (isEditMode && values.id) {
        await updateEmployee(values.id, payload);
        toast({ title: 'Berhasil', description: 'Data diperbarui' });
      } else {
        await addEmployee(payload as any);
        toast({ title: 'Berhasil', description: 'Karyawan ditambahkan' });
      }
      setIsOpen(false);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden flex flex-col max-h-[90vh]">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl flex items-center gap-2">
            {isEditMode ? <Briefcase className="h-5 w-5" /> : <User className="h-5 w-5" />}
            {isEditMode ? 'Edit Profil Karyawan' : 'Registrasi Karyawan Baru'}
          </DialogTitle>
          <DialogDescription>
            Isi formulir berikut untuk memanajemen data entitas karyawan.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
            <ScrollArea className="flex-1 px-6">
              <div className="space-y-6 py-4">
                {/* Section 1: Personal Info */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <IdCard className="h-4 w-4" /> Informasi Identitas
                  </div>
                  <FormField control={form.control} name="fullName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Lengkap</FormLabel>
                      <FormControl><Input placeholder="Masukkan nama sesuai KTP" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}/>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="nikKependudukan" render={({ field }) => (
                      <FormItem>
                        <FormLabel>NIK Kependudukan (KTP)</FormLabel>
                        <FormControl><Input placeholder="16 digit NIK" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}/>
                    <FormField control={form.control} name="nikPekerja" render={({ field }) => (
                      <FormItem>
                        <FormLabel>NIK Pekerja (ID Perusahaan)</FormLabel>
                        <FormControl><Input placeholder="Contoh: EMP-2024" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}/>
                  </div>
                </div>

                <Separator />

                {/* Section 2: Job Info */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <Briefcase className="h-4 w-4" /> Detail Pekerjaan
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="division" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Divisi</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}/>
                    <FormField control={form.control} name="position" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jabatan</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}/>
                  </div>
                  <FormField control={form.control} name="startDate" render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Tanggal Bergabung</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                              {field.value ? formatToWIB(field.value, 'PPP') : "Pilih tanggal"}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}/>
                  <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alamat Domisili</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}/>
                </div>

                <Separator />

                {/* Section 3: Account Info */}
                <div className="space-y-4 bg-muted/30 p-4 rounded-lg border border-dashed">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <Lock className="h-4 w-4" /> Kredensial Akun
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="username" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl><Input {...field} disabled={isEditMode} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}/>
                    <FormField control={form.control} name="password" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{isEditMode ? 'Ganti Password' : 'Password'}</FormLabel>
                        <FormControl><Input type="password" placeholder={isEditMode ? "Kosongkan jika tidak diubah" : "Minimal 6 karakter"} {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}/>
                  </div>
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="p-6 bg-muted/20 border-t gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Batal</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Proses...' : 'Simpan Data'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}