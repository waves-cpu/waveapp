'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AppLayout } from '@/app/components/app-layout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MoreVertical, PlusCircle, Trash2, Edit } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useInventory } from '@/hooks/use-inventory';
import type { Employee } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { formatToWIB } from '@/lib/utils';
import { parseISO } from 'date-fns';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

function EmployeeManagementPage() {
  const { employees, deleteEmployee, loading } = useInventory();
  const { toast } = useToast();
  const router = useRouter();
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  const handleEdit = (employee: Employee) => {
    router.push(`/settings/employees/edit/${employee.id}`);
  };

  const handleDelete = async () => {
    if (!employeeToDelete) return;
    try {
      await deleteEmployee(employeeToDelete.id);
      toast({
        title: 'Karyawan Dihapus',
        description: `Data untuk ${employeeToDelete.fullName} telah dihapus.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Gagal Menghapus',
        description: error.message || 'Terjadi kesalahan saat menghapus karyawan.',
      });
    } finally {
      setEmployeeToDelete(null);
    }
  };

  return (
    <>
      <main className="flex-1 p-4 md:p-10">
        <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
                <SidebarTrigger className="md:hidden" />
                <h1 className="text-lg font-bold">Manajemen Karyawan</h1>
            </div>
            <Button asChild>
                <Link href="/settings/employees/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Tambah Karyawan
                </Link>
            </Button>
        </div>
        
        <Card>
            <CardContent className="pt-6">
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nama Lengkap</TableHead>
                            <TableHead>NIK Pekerja</TableHead>
                            <TableHead>Divisi</TableHead>
                            <TableHead>Jabatan</TableHead>
                            <TableHead>Tgl. Masuk</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">Memuat data karyawan...</TableCell>
                            </TableRow>
                        ) : employees && employees.length > 0 ? (
                            employees.map(employee => (
                                <TableRow key={employee.id}>
                                    <TableCell className="font-medium">{employee.fullName}</TableCell>
                                    <TableCell>{employee.nikPekerja}</TableCell>
                                    <TableCell>{employee.division}</TableCell>
                                    <TableCell>{employee.position}</TableCell>
                                    <TableCell>{employee.startDate ? formatToWIB(parseISO(employee.startDate), 'dd MMM yyyy') : '-'}</TableCell>
                                    <TableCell className="text-right">
                                         <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleEdit(employee)}>
                                                    <Edit className="mr-2 h-4 w-4" /> Ubah
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="text-destructive" onClick={() => setEmployeeToDelete(employee)}>
                                                    <Trash2 className="mr-2 h-4 w-4" /> Hapus
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                             <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">Belum ada data karyawan.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </main>

      <AlertDialog open={!!employeeToDelete} onOpenChange={(open) => !open && setEmployeeToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Anda yakin ingin menghapus karyawan ini?</AlertDialogTitle>
                <AlertDialogDescription>
                    Tindakan ini akan menghapus data karyawan "{employeeToDelete?.fullName}" dan akun pengguna terkait secara permanen.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                    Ya, Hapus
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}


export default function WrappedEmployeePage() {
    return (
        <AppLayout>
            <EmployeeManagementPage />
        </AppLayout>
    )
}
