'use client';
import { CompanyPolicy, CompanyType, Note } from '@/types/type';
import { Breadcrumbs } from './Breadcrumbs';
import { Dispatch, SetStateAction, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { NoteEditor } from '../CallSheet/Notes/NoteEditor';
import { ContainerItems, List } from '../CallSheet/Notes/List';
import { createClient } from '@/lib/supabase/client';
import { useCompanyStore } from '@/store/company';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Tab } from '@/components/ui/Tab';
import { NoteType } from '@/components/blocks/CallSheet/Notes/Manage';

const createNewPolicy = (
  type: NoteType,
  company: string,
  /* @ts-ignore */
): CompanyPolicy => ({
  id: -Date.now(),
  note: '',
  priority: 0,
  title: '',
  acknowledgeable: false,
  type,
  company: company,
});

export const Settings = ({ company }: { company?: CompanyType | null }) => {
  const supabase = createClient();
  const { activeCompany } = useCompanyStore();
  const [current, setCurrent] = useState<number | null>(null);
  const [containers, setContainers] = useState<{
    before_details: CompanyPolicy[];
    on_page: CompanyPolicy[];
    featured: [];
  }>({ before_details: [], on_page: [], featured: [] });
  const [priority, setPriority] = useState<'above' | 'below'>('above');

  const [loading, setLoading] = useState(false);

  const [policies, setPolicies] = useState<CompanyPolicy[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentNote = useMemo(
    () => [...containers.before_details, ...containers.on_page].find((n) => n.id === current),
    [containers, current],
  );
  const addNewNote = (type: NoteType) => {
    if (!company) return;

    const newNote = createNewPolicy(type, company?.id);

    setContainers((prevContainers) => ({
      ...prevContainers,
      [type]: [
        ...prevContainers[type].map((n) => ({
          ...n,
          priority: (n?.priority ?? 0) + 1,
        })),
        newNote,
      ],
    }));
    setHasChanges(true);
    setCurrent(newNote.id);
  };

  const deleteNote = async () => {
    if (current !== null) {
      const noteToDelete = [...containers.before_details, ...containers.on_page].find((note) => note.id === current);

      if (noteToDelete && noteToDelete.id > 0) {
        const { error } = await supabase.from('company_policy').delete().eq('id', noteToDelete.id);

        if (error) {
          toast.error(`Error deleting note: ${error.message}`);
          return;
        }
      }

      if (!noteToDelete) {
        return;
      }

      const updateNotes = (prevNotes: CompanyPolicy[]) => {
        const updatedNotes = prevNotes.filter((note) => note.id !== current);
        setCurrent(updatedNotes.length > 0 ? updatedNotes[0]?.id : null);
        return updatedNotes;
      };

      setContainers((prevContainers) => ({
        ...prevContainers,
        [noteToDelete.type as NoteType]: updateNotes(prevContainers[noteToDelete.type as NoteType]),
      }));

      toast.success('Notice deleted successfully');
    }
  };

  const updateNote = useCallback(
    (field: 'title' | 'note' | 'acknowledgeable' | 'type' | 'isHighlighted', value: string | boolean) => {
      if (!!currentNote) {
        setContainers((prevContainers) => {
          const updatedContainers = {
            ...prevContainers,
            [currentNote.type as NoteType]: prevContainers[currentNote.type as NoteType].map((note) =>
              note.id === currentNote.id ? { ...note, [field]: value } : note,
            ),
          };
          setHasChanges(true);
          return updatedContainers;
        });
      }
    },
    [currentNote],
  );

  const discardChanges = useCallback(() => {
    setContainers({
      before_details: policies?.filter((n) => n.type === 'before_details'),
      on_page: policies?.filter((n) => n.type === 'on_page'),
      featured: [],
    });
    setHasChanges(false);
  }, [policies]);

  const handleSave = useCallback(async () => {
    if (current !== null) {
      setLoading(true);
      const notesToSave = [...containers.before_details, ...containers.on_page].map((note, index) => {
        const type = containers.before_details.some((n) => n.id === note.id)
          ? 'before_details'
          : ('on_page' as NoteType);

        if (note.id < 0) {
          const { id, ...noteWithoutId } = note;

          return {
            ...noteWithoutId,
            type,
            priority: index,
            acknowledgeable: type === 'on_page' ? false : note.acknowledgeable,
          };
        }
        return { ...note, type, priority: index };
      });

      const { data, error } = await supabase
        .from('company_policy')
        .upsert(notesToSave, { defaultToNull: false })
        .select()
        .order('priority', { ascending: true });

      if (error) {
        toast.error(`Error saving note: ${error.message}`);
      } else {
        setPolicies(data);
        setContainers({
          before_details: data?.filter((n) => n.type === 'before_details'),
          on_page: data?.filter((n) => n.type === 'on_page'),
          featured: [],
        });

        if (current < 0 && data?.length > 0) {
          setCurrent(data[data?.length - 1]?.id);
        }

        setHasChanges(false);

        toast.success('Notice saved successfully');
      }
      setLoading(false);
    }
  }, [current, containers, supabase]);

  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (current !== null && textareaRef.current) {
      textareaRef.current.focus();

      const length = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(length, length);
    }
  }, [current]);

  const getData = async () => {
    if (!activeCompany) return;

    const { data, error } = await supabase.from('company_policy').select().eq('company', activeCompany);

    if (error) {
      toast.error(error.message);
      return;
    }

    setPolicies(data);

    setCurrent(data[0]?.id);

    setContainers({
      before_details: data?.filter((n) => n.type === 'before_details'),
      on_page: data?.filter((n) => n.type === 'on_page'),
      featured: [],
    });
  };

  const getSettings = async () => {
    if (!activeCompany) return;

    const { data } = await supabase.from('company_setting').select().eq('company', activeCompany);

    setPriority(data?.[0]?.company_notice_priority ?? 'above');
  };

  const updateSettings = async (p: 'above' | 'below') => {
    if (!activeCompany) return;

    const { error } = await supabase
      .from('company_setting')
      .upsert({ company_notice_priority: p, company: activeCompany }, { onConflict: 'company' })
      .eq('company', activeCompany);

    if (!error) {
      toast.success('Priority updated');
    }
  };

  useEffect(() => {
    getData();
    getSettings();
  }, []);

  return (
    <>
      <div className="flex flex-1 flex-col gap-8 py-10">
        {company && <Breadcrumbs company={company} page="Company Notices" />}

        <div className="text-white text-[38px] font-normal font-['SF Pro'] justify-self-start">Company Notices</div>

        <div className="flex flex-col gap-2">
          <div className="text-white text-sm font-bold">Priority of notices</div>
          <div className="flex items-center gap-2">
            <Tab
              options={['above', 'below']}
              selected={priority}
              setSelected={(p) => {
                setPriority(p as 'above' | 'below');
                updateSettings(p as 'above' | 'below');
              }}
              defaultWidth={68}
            />
            <div className="opacity-60 text-white text-xs font-medium">any custom project notes</div>
          </div>
        </div>

        <div className="flex gap-6 max-w-[700px] overflow-hidden">
          <div className="flex-1 max-w-[350px] overflow-y-auto flex flex-col">
            <List
              containers={containers as unknown as ContainerItems}
              setContainers={setContainers as unknown as Dispatch<SetStateAction<ContainerItems>>}
              current={current}
              setCurrent={setCurrent}
              addNewNote={addNewNote}
              company
            />
          </div>
          <NoteEditor
            deleteNote={deleteNote}
            currentNote={currentNote as unknown as Note}
            updateNote={updateNote}
            textareaRef={textareaRef}
          />
        </div>
        <div className="flex gap-2 items-center justify-end max-w-[700px]">
          <Button
            className="px-4 text-sm font-semibold bg-white bg-opacity-0 hover:bg-opacity-[.03]"
            variant="outline"
            size="compact"
            onClick={discardChanges}
            disabled={!hasChanges}
          >
            Discard changes
          </Button>

          <Button
            className="px-4 min-w-[125px] text-sm font-semibold disabled:bg-opacity-20 disabled:pointer-events-none disabled:cursor-not-allowed"
            variant="accent"
            size="compact"
            onClick={handleSave}
            disabled={loading || !hasChanges}
          >
            {loading ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      </div>
    </>
  );
};
