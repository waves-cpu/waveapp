'use client';

import React, { useEffect, useState } from 'react';
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
  nikPekerja: z.string().optional(),
  nikKependudukan: z.string().optional(),
  division: z.string().optional(),
  position: z.string().optional(),
  address: z.string().optional(),
  startDate: z.date().optional(),
  username: z.string().min(3, 'Username minimal 3 karakter.'),
  password: z.string().optional(),
}).refine(data => {
    // If it's a new employee (no id), password is required
    if (!data.id) {
        return data.password && data.password.length >= 6;
    }
    return true;
}, {
    message: "Password baru minimal 6 karakter.",
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
  });
  
  const { reset } = form; // Destructuring for stable dependency

  useEffect(() => {
    if (isOpen) {
        reset({
            id: employee?.id,
            fullName: employee?.fullName || '',
            nikPekerja: employee?.nikPekerja || '',
            nikKependudukan: employee?.nikKependudukan || '',
            division: employee?.division || '',
            position: employee?.position || '',
            address: employee?.address || '',
            startDate: employee?.startDate ? new Date(employee.startDate) : undefined,
            username: employee?.username || '',
            password: '',
        });
    }
  }, [isOpen, employee, reset]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      if (isEditMode) {
        await updateEmployee(values.id!, {
            ...values,
            startDate: values.startDate ? values.startDate.toISOString() : undefined,
        });
        toast({ title: 'Data Karyawan Diperbarui' });
      } else {
        await addEmployee({
            ...values,
            startDate: values.startDate ? values.startDate.toISOString() : undefined,
        });
        toast({ title: 'Karyawan Baru Ditambahkan' });
      }
      setIsOpen(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Gagal Menyimpan',
        description: error.message,
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Ubah Data Karyawan' : 'Tambah Karyawan Baru'}</DialogTitle>
          <DialogDescription>
            Lengkapi detail karyawan di bawah ini.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <ScrollArea className="max-h-[60vh] p-1">
              <div className="space-y-4 px-4 py-2">
                <FormField control={form.control} name="fullName" render={({ field }) => (
                  <FormItem><FormLabel>Nama Lengkap</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="nikKependudukan" render={({ field }) => (
                        <FormItem><FormLabel>NIK Kependudukan</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="nikPekerja" render={({ field }) => (
                        <FormItem><FormLabel>NIK Pekerja</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="division" render={({ field }) => (
                        <FormItem><FormLabel>Divisi</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="position" render={({ field }) => (
                        <FormItem><FormLabel>Jabatan</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                </div>
                <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem><FormLabel>Alamat</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="startDate" render={({ field }) => (
                    <FormItem className="flex flex-col"><FormLabel>Tanggal Masuk Kerja</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild><FormControl><Button
                                variant={"outline"}
                                className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                            >
                                {field.value ? formatToWIB(field.value, 'PPP') : <span>Pilih tanggal</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button></FormControl></PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                            </PopoverContent>
                        </Popover>
                        <FormMessage/>
                    </FormItem>
                )}/>
                <div className="border-t pt-6 mt-6 space-y-4">
                     <h3 className="text-sm font-semibold text-muted-foreground">Akun Pengguna</h3>
                    <FormField control={form.control} name="username" render={({ field }) => (
                        <FormItem><FormLabel>Username</FormLabel><FormControl><Input {...field} disabled={isEditMode} autoComplete="new-password" /></FormControl><FormMessage /></FormItem>
                    )}/>
                    {!isEditMode && (
                        <FormField control={form.control} name="password" render={({ field }) => (
                            <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" {...field} autoComplete="new-password"/></FormControl><FormMessage /></FormItem>
                        )}/>
                    )}
                </div>
              </div>
            </ScrollArea>
            <DialogFooter className="pt-6 border-t mt-4">
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} disabled={form.formState.isSubmitting}>Batal</Button>
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
