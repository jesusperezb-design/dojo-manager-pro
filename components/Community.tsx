
import React from 'react';
import type { CommunityPost } from '../types';

interface CommunityProps {
    posts: CommunityPost[];
}

const IconHeart = ({ filled }: { filled: boolean }) => (
    <svg className={`w-6 h-6 ${filled ? 'text-red-500' : 'text-high-contrast-white'}`} fill={filled ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
);

const IconComment = () => (
    <svg className="w-6 h-6 text-high-contrast-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
);

const IconShare = () => (
    <svg className="w-6 h-6 text-high-contrast-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
    </svg>
);

const Community: React.FC<CommunityProps> = ({ posts }) => {
    const [showNewPostModal, setShowNewPostModal] = React.useState(false);
    const [likes, setLikes] = React.useState<{[key: string]: number}>({});
    const [comments, setComments] = React.useState<{[key: string]: string[]}>({});
    
    const handleLike = (postId: string) => {
        setLikes(prev => ({
            ...prev,
            [postId]: (prev[postId] || 0) + 1
        }));
    };

    return (
        <div className="p-8 text-high-contrast-white max-w-2xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Comunidad del Dojo</h1>
                <button 
                    onClick={() => setShowNewPostModal(true)}
                    className="px-4 py-2 rounded bg-gradient-to-r from-neon-blue to-cyan-400 hover:shadow-neon transition-shadow"
                >
                    Nueva Publicación
                </button>
            </div>

            <div className="space-y-8">
                {posts.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(post => (
                    <div key={post.id} className="bg-nebula-blue border border-neon-blue/20 rounded-lg overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center p-4">
                            <img 
                                src={post.imageUrl} 
                                alt={post.author} 
                                className="w-10 h-10 rounded-full object-cover"
                            />
                            <div className="ml-3">
                                <p className="font-semibold">{post.author}</p>
                                <p className="text-xs text-secondary-gray">{new Date(post.date).toLocaleDateString()}</p>
                            </div>
                        </div>
                        
                        {/* Image */}
                        <img 
                            src={post.imageUrl} 
                            alt={post.caption} 
                            className="w-full aspect-square object-cover"
                        />
                        
                        {/* Actions */}
                        <div className="p-4 border-t border-neon-blue/10">
                            <div className="flex items-center space-x-4 mb-3">
                                <button 
                                    onClick={() => handleLike(post.id)}
                                    className="transition-transform hover:scale-110 focus:outline-none"
                                >
                                    <IconHeart filled={!!likes[post.id]} />
                                </button>
                                <button className="transition-transform hover:scale-110 focus:outline-none">
                                    <IconComment />
                                </button>
                                <button className="transition-transform hover:scale-110 focus:outline-none">
                                    <IconShare />
                                </button>
                            </div>
                            <div className="text-sm font-semibold mb-2">
                                {likes[post.id] || 0} Me gusta
                            </div>
                        </div>
                        
                        {/* Caption */}
                        <div className="px-4 pb-4">
                            <p className="text-high-contrast-white"><span className="font-bold">{post.author}</span> {post.caption}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Community;
