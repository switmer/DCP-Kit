import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Icon } from '@/components/ui/Icon';
import { createClient } from '@/lib/supabase/client';
import { Note } from '@/types/type';
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { toast } from 'sonner';
import { List } from '@/components/blocks/CallSheet/Notes/List';
import { NoteEditor } from '@/components/blocks/CallSheet/Notes/NoteEditor';

export type NoteType = 'before_details' | 'on_page' | 'featured';

type Props = {
  open?: number | null | boolean;
  onClose: (notes?: Note[]) => void;
  setNotes: (notes: Note[]) => void;
  notes: Note[];
  project: string;
};

const createNewNote = (
  type: NoteType,
  project: string,
  /* @ts-ignore */
): Note => ({
  id: -Date.now(),
  title: '',
  note: '',
  acknowledgeable: false,
  priority: 0,
  project: project,
  type,
});

export const ManageProjectNotes: React.FC<Props> = ({ open, onClose, notes, project, setNotes }) => {
  const [current, setCurrent] = useState(open);
  const [containers, setContainers] = useState<{
    before_details: Note[];
    on_page: Note[];
    featured: Note[];
  }>({
    before_details: notes.filter((n) => n.type === 'before_details'),
    on_page: notes.filter((n) => n.type === 'on_page'),
    featured: [],
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const supabase = createClient();

  useEffect(() => {
    if (typeof open === 'boolean') {
      setCurrent(notes[0]?.id ?? null);

      return;
    }

    setCurrent(open);
  }, [open]);

  useEffect(() => {
    if (current !== null && textareaRef.current) {
      textareaRef.current.focus();

      const length = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(length, length);
    }
  }, [current]);

  const currentNote = useMemo(
    () => [...containers.before_details, ...containers.on_page, ...containers.featured].find((n) => n.id === current),
    [containers, current],
  );

  const addNewNote = (type: NoteType) => {
    const newNote = createNewNote(type, project);

    setContainers((prevContainers) => {
      const updatedNotes = prevContainers[type as keyof typeof prevContainers].map((n) => ({
        ...n,
        priority: (n?.priority ?? 0) + 1,
      }));

      return {
        ...prevContainers,
        [type]: [...updatedNotes, newNote],
      };
    });

    setCurrent(newNote.id);
  };

  const handleSave = async () => {
    if (current !== null) {
      const notesToSave = [...containers.before_details, ...containers.on_page, ...containers.featured].map(
        (note, index) => {
          let type: NoteType;

          if (containers.before_details.some((n) => n.id === note.id)) {
            type = 'before_details';
          } else if (containers.featured.some((n) => n.id === note.id)) {
            type = 'featured';
          } else {
            type = 'on_page';
          }

          if (note.id < 0) {
            const { id, ...noteWithoutId } = note;

            return {
              ...noteWithoutId,
              type,
              priority: index,
              acknowledgeable: type === 'on_page' || type === 'featured' ? false : note.acknowledgeable,
            };
          }
          return { ...note, type, priority: index };
        },
      );

      const { data, error } = await supabase
        .from('note')
        .upsert(notesToSave, { defaultToNull: false })
        .select()
        .order('priority', { ascending: true });

      if (error) {
        toast.error(`Error saving note: ${error.message}`);
      } else {
        onClose(data);
      }
    }
  };

  const deleteNote = async () => {
    if (current !== null) {
      const noteToDelete = [...containers.before_details, ...containers.on_page, ...containers.featured].find(
        (note) => note.id === current,
      );

      if (noteToDelete && noteToDelete.id > 0) {
        const { error } = await supabase.from('note').delete().eq('id', noteToDelete.id);

        if (error) {
          toast.error(`Error deleting note: ${error.message}`);
          return;
        }
      }

      if (!noteToDelete) {
        return;
      }

      setNotes(notes.filter((n) => n.id !== current));

      const updateNotes = (prevNotes: Note[]) => {
        const updatedNotes = prevNotes.filter((note) => note.id !== current);

        setCurrent(updatedNotes.length > 0 ? updatedNotes[0]?.id : null);

        return updatedNotes;
      };

      setContainers((prevContainers) => ({
        ...prevContainers,
        [noteToDelete.type]: updateNotes(prevContainers[noteToDelete.type as keyof typeof prevContainers]),
      }));

      toast.success('Note deleted successfully');
    }
  };

  const updateNote = (
    field: 'title' | 'note' | 'acknowledgeable' | 'type' | 'isHighlighted',
    value: string | boolean,
  ) => {
    if (!!currentNote) {
      if (field === 'type' && typeof value === 'string') {
        // handle type change (e.g., from 'on_page' to 'featured' or vice versa).
        const oldType = currentNote.type;
        const newType = value as NoteType;

        setContainers((prevContainers) => {
          // remove from the old container.
          const updatedOldContainer = prevContainers[oldType as keyof typeof prevContainers].filter(
            (note) => note.id !== currentNote.id,
          );

          // add to new container with updated type.
          const updatedNote = { ...currentNote, [field]: value };
          const updatedNewContainer = [...prevContainers[newType as keyof typeof prevContainers], updatedNote];

          return {
            ...prevContainers,
            [oldType]: updatedOldContainer,
            [newType]: updatedNewContainer,
          };
        });
      } else {
        // handle other field updates.
        setContainers((prevContainers) => ({
          ...prevContainers,
          [currentNote.type]: prevContainers[currentNote.type as keyof typeof prevContainers].map((note) =>
            note.id === currentNote.id ? { ...note, [field]: value } : note,
          ),
        }));
      }
    }
  };

  return (
    <Dialog
      defaultOpen={!!open}
      open={!!open}
      onOpenChange={(o) => {
        if (!o) {
          onClose(notes?.filter((n) => n.id > 0));
        }
      }}
    >
      <DialogContent className="flex flex-col max-w-[620px] w-full gap-0 max-sm:min-h-full">
        <DialogHeader className="max-sm:h-[75px]">
          <div className="flex justify-between items-center">
            <DialogTitle>
              <div className="flex items center gap-2 items-center">Manage project notes</div>
            </DialogTitle>

            <button
              onClick={() => onClose(notes?.filter((n) => n.id > 0))}
              className="w-10 h-10 flex justify-center items-center rounded-[10px] bg-zinc-900 bg-opacity-80 hover:bg-opacity-100 duration-100"
            >
              <Icon name="cross" className="w-5 h-5 text-zinc-400" />
            </button>
          </div>
        </DialogHeader>

        <div className="p-6 flex gap-6 max-w-[800px] overflow-hidden max-sm:flex-col max-sm:max-h-[calc(100vh-150px)] max-sm:overflow-y-scroll">
          <div className="flex-1 max-w-[215px] max-h-[500px] overflow-y-auto flex flex-col max-sm:h-[50%] max-sm:max-w-[unset] max-sm:w-full">
            <div className="text-white text-lg font-semibold">Show note...</div>
            <List
              containers={containers}
              setContainers={setContainers}
              current={current}
              setCurrent={setCurrent}
              addNewNote={addNewNote}
            />
          </div>

          <div className="max-sm:h-[50%]">
            <NoteEditor
              deleteNote={deleteNote}
              currentNote={currentNote}
              updateNote={updateNote}
              textareaRef={textareaRef}
            />
          </div>
        </div>

        <DialogFooter className="max-sm:flex-row max-sm:gap-2 max-sm:items-center max-sm:justify-end max-sm:h-[75px] max-sm:p-3">
          <Button
            className="px-4 text-sm font-semibold bg-white bg-opacity-0 hover:bg-opacity-[.03] max-sm:w-[100px]"
            variant="outline"
            size="compact"
            onClick={() => onClose(notes?.filter((n) => n.id > 0))}
          >
            Cancel
          </Button>

          <Button
            className="px-4 min-w-[65px] text-sm font-semibold disabled:bg-opacity-20 disabled:pointer-events-none disabled:cursor-not-allowed max-sm:w-[130px]"
            variant="accent"
            size="compact"
            onClick={handleSave}
          >
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
