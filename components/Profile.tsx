
import React, { useState, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { compressImage } from '../utils/imageCompression';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebaseStorage';

import { StudentProfile } from './profile/StudentProfile';
import { TeacherProfile } from './profile/TeacherProfile';
import { EnterpriseProfile } from './profile/EnterpriseProfile';
import type { ProfileViewProps } from './profile/ProfileTypes';

const Profile: React.FC = () => {
    const { user, userRole, updateUser } = useAuth();
    const { updateWallpaper, removeWallpaper, wallpaper: contextWallpaper } = useSettings();
    const { addToast } = useToast();
    
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState('');
    const [series, setSeries] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [isUploadingWallpaper, setIsUploadingWallpaper] = useState(false);

    useEffect(() => {
        if (user) {
            setName(user.name || '');
            setSeries(user.series || '');
            setAvatarUrl(user.avatarUrl || '');
        }
    }, [user]);

    const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && user) {
            setIsUploadingAvatar(true);
            try {
                const file = e.target.files[0];
                const storageRef = ref(storage, `avatars/users/${user.id}_${Date.now()}`);
                await uploadBytes(storageRef, file);
                const url = await getDownloadURL(storageRef);
                setAvatarUrl(url);
                addToast("Avatar carregado no buffer!", "info");
            } catch (error: any) {
                console.error("Avatar Upload Error:", error);
                const errorMessage = error.code ? `Erro Firebase: ${error.code}` : "Erro no upload do avatar.";
                addToast(errorMessage, "error");
            } finally {
                setIsUploadingAvatar(false);
            }
        }
    };

    const handleWallpaperChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setIsUploadingWallpaper(true);
            try {
                const compressed = await compressImage(e.target.files[0]);
                await updateWallpaper(compressed);
                addToast("Wallpaper atualizado!", "success");
            } catch (error: any) {
                console.error("Wallpaper Upload Error:", error);
                addToast(`Erro: ${error.message || 'Falha no wallpaper'}`, "error");
            } finally {
                setIsUploadingWallpaper(false);
            }
        }
    };

    const handleSave = async () => {
        if (!user) return;
        try {
            await updateUser({ name, series, avatarUrl });
            setIsEditing(false);
            addToast("Dados salvos com sucesso!", "success");
        } catch (error) { addToast("Falha ao salvar.", "error"); }
    };

    const sharedProps: ProfileViewProps = {
        user, isEditing, setIsEditing, name, setName, series, setSeries,
        avatarUrl, setAvatarUrl, handleSave, handleAvatarFileChange, isUploadingAvatar,
        handleWallpaperChange, isUploadingWallpaper, wallpaper: contextWallpaper,
        removeWallpaper
    };

    if (userRole === 'aluno') return <StudentProfile {...sharedProps} />;
    if (userRole === 'professor') return <TeacherProfile {...sharedProps} />;
    return <EnterpriseProfile {...sharedProps} />;
};

export default Profile;
