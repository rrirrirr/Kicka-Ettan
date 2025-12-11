import { FileText, GitCommit } from 'lucide-react';
import { Dialog } from './ui';

interface ChangelogDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

interface ChangeLogEntry {
    version: string;
    date: string;
    changes: string[];
}

const CHANGELOG: ChangeLogEntry[] = [];

export function ChangelogDialog({ isOpen, onClose }: ChangelogDialogProps) {
    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title="changelog"
            variant="info"
            headerIcon={<FileText size={48} className="text-gray-400" />}
        >
            <div className="px-2 pb-2">
                <div className="relative border-l-2 border-gray-100 ml-3 space-y-8 py-2">
                    {CHANGELOG.length === 0 ? (
                        <div className="pl-8 py-4 text-center">
                            <p className="text-gray-500 italic">No recent changes to display.</p>
                        </div>
                    ) : (
                        CHANGELOG.map((entry) => (
                            <div key={entry.version} className="relative pl-8">
                                {/* Timeline node */}
                                <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white border-2 border-icy-blue-medium shadow-sm"></div>

                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mb-2">
                                    <h3 className="font-bold text-lg text-gray-800">v{entry.version}</h3>
                                    <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-full border border-gray-100">
                                        {entry.date}
                                    </span>
                                </div>

                                <ul className="space-y-2">
                                    {entry.changes.map((change, i) => (
                                        <li key={i} className="text-sm text-gray-600 flex items-start gap-2 leading-relaxed">
                                            <GitCommit size={14} className="mt-1 text-gray-400 flex-shrink-0" />
                                            <span>{change}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </Dialog>
    );
}
