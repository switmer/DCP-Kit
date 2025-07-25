import { useMemo, useState } from 'react';
import { Avatar, AvatarFallback } from '../../Avatar';
import { createClient } from '@/lib/supabase/client';
import { cn, makeInitials } from '@/lib/utils';
import Cookies from 'js-cookie';
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '../../DropdownMenu';
import { DropdownMenuContent } from '@radix-ui/react-dropdown-menu';
import { useRouter } from 'next-nprogress-bar';
import { getUser } from '@/queries/get-user';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Icon } from '@/components/ui/Icon';
import { toast } from 'sonner';
import { useCompanyStore } from '@/store/company';
import { CreateCompanyDialog } from './CreateCompany';

export const Profile = () => {
  const [showCreateCompanyDialog, setShowCreateCompanyDialog] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const supabase = createClient();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { activeCompany, setActiveCompany } = useCompanyStore();

  const {
    /* @ts-ignore */
    data: { user } = {},
  } = useQuery({ queryKey: ['user'], queryFn: () => getUser(supabase) });

  const { data: userCompanies = [] } = useQuery({
    queryKey: ['userCompanies'],
    queryFn: async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('company_user')
        .select(
          `
        company (*)
        `,
        )
        .eq('user', user.id);

      if (error) {
        toast.error('Something went wrong fetching user companies.');

        return;
      }

      return data;
    },
    enabled: !!user,
  });

  const initials = useMemo(() => {
    if (!user?.user_metadata?.name) return '-';

    return makeInitials(user?.user_metadata?.name);
  }, [user?.user_metadata?.name]);

  if (!user)
    return (
      <>
        <div className="hidden max-sm:flex items-center justify-center h-[72px] w-full cursor-pointer hover:bg-white hover:bg-opacity-5 duration-150 [&>span]:data-[state=open]:border-opacity-100 max-sm:hover:bg-opacity-0 max-sm:w-[50px] max-sm:max-w-[50px]">
          <div className="border-2 border-lime-300 border-opacity-0 rounded-full p-1 duration-150">
            <Icon name="logo-motif" className="h-10 w-10 text-lime-300 spin-ease-in-out bg-opacity-0" />
          </div>
        </div>
      </>
    );

  return (
    <>
      <>
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger className="flex items-center justify-center h-[72px] w-full cursor-pointer hover:bg-white hover:bg-opacity-5 duration-150 [&>span]:data-[state=open]:border-opacity-100 max-sm:hover:bg-opacity-0 max-sm:w-[50px] max-sm:max-w-[50px]">
            <span className="border-2 border-lime-300 border-opacity-0 rounded-full p-1 duration-150">
              <Avatar>
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </span>
          </DropdownMenuTrigger>

          <DropdownMenuPortal>
            <DropdownMenuContent
              side="right"
              sideOffset={-12}
              align="center"
              className="z-40 flex flex-col gap-1 p-2 bg-neutral-950 rounded-xl shadow border border-white border-opacity-10 w-[240px] max-sm:fixed max-sm:bottom-[40px] max-sm:left-[-130px]"
            >
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="cursor-pointer z-40 h-9 pl-3 pr-2 py-2 flex items-center gap-2 hover:bg-white/5 focus:bg-white/5 data-[state=open]:bg-white/5  rounded-lg text-white text-sm group">
                  <div className="flex-1 flex items-center gap-2">
                    <Icon
                      name="switch"
                      className="w-6 h-6 text-white opacity-50 group-hover:opacity-100 group-focus:opacity-100 group-data-[state=open]:opacity-100"
                    />
                    Switch company
                  </div>
                  <Icon
                    name="chevron-small"
                    className="w-6 h-6 text-white opacity-50 group-hover:opacity-100 group-focus:opacity-100 group-data-[state=open]:opacity-100"
                  />
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="z-40 p-2 gap-1 flex flex-col bg-neutral-950 rounded-xl shadow border border-white border-opacity-10 w-[240px]">
                  {userCompanies?.map((c) => {
                    return (
                      <DropdownMenuItem
                        key={c?.company?.id}
                        onClick={async () => {
                          if (activeCompany === c?.company?.id || !c?.company?.id) {
                            return;
                          }

                          setActiveCompany(c?.company?.id);
                          window.location.href = '/';
                        }}
                        className={cn(
                          'z-40 h-12 pl-3 pr-2 py-2 flex font-bold items-center gap-2 hover:bg-white hover:bg-opacity-5 rounded-lg text-white text-sm group',
                          activeCompany === c?.company?.id && `bg-accent/5`,
                        )}
                      >
                        <Avatar className="w-8 h-8">
                          <AvatarFallback>
                            <span>{c?.company?.name?.[0]}</span>
                          </AvatarFallback>
                        </Avatar>
                        {c?.company?.name}
                      </DropdownMenuItem>
                    );
                  })}
                  <DropdownMenuItem
                    onClick={() => {
                      setDropdownOpen(false);

                      setTimeout(() => {
                        setShowCreateCompanyDialog(true);
                      }, 50);
                    }}
                    className={cn(
                      'z-40 h-12 pl-3 pr-2 py-2 flex font-medium items-center gap-2 hover:bg-white hover:bg-opacity-5 rounded-lg !text-accent text-sm group',
                    )}
                  >
                    <Icon name="plus" className="w-5 h-5" />
                    Create new company
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuItem
                onClick={async () => {
                  await supabase.auth.signOut();
                  Cookies.remove('activeCompany', { path: '/' });
                  queryClient.clear();
                  router.refresh();
                }}
                className="z-40 h-9 pl-3 pr-2 py-2 flex items-center gap-2 hover:bg-white hover:bg-opacity-5 rounded-lg text-white text-sm group"
              >
                <Icon name="logout" className="w-6 h-6 text-white opacity-50 group-hover:opacity-100" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenuPortal>
        </DropdownMenu>
      </>
      {showCreateCompanyDialog && (
        <CreateCompanyDialog
          onDone={(id) => {
            setActiveCompany(id);
            window.location.href = '/';
          }}
          user={user.id}
          open={showCreateCompanyDialog}
          setOpen={setShowCreateCompanyDialog}
        />
      )}
    </>
  );
};
