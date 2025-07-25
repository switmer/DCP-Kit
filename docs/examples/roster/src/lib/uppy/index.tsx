"use client";

import Uppy, { UppyFile } from "@uppy/core";
import { v4 as uuidv4 } from "uuid";
import Tus from "@uppy/tus";
import React, {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { createClient } from "../supabase/client";
import { useQuery } from "@tanstack/react-query";
import { getUser } from "@/queries/get-user";

interface UppyContextProps {
  uppy: Uppy | null;
}

const UppyContext = createContext<UppyContextProps | undefined>(undefined);

interface UppyProviderProps {
  children: ReactNode;
}

export const UPPY_TUS_ENDPOINT = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/upload/resumable`;
export const UPPY_BUCKET = "call-sheets";

export const UppyProvider: React.FC<UppyProviderProps> = ({ children }) => {
  const [token, setToken] = useState<string | undefined>();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setToken(session?.access_token);
        });
      }
    });
  }, [supabase]);

  const {
    /* @ts-ignore */
    data,
  } = useQuery({ queryKey: ["user"], queryFn: () => getUser(supabase) });

  const userId = data?.user?.id;

  const [uppy, setUppy] = useState<Uppy | null>(null);

  useEffect(() => {
    if (!token) return;

    setUppy(() =>
      new Uppy({
        restrictions: {
          allowedFileTypes: ["application/pdf"],
        },
      }).use(Tus, {
        endpoint: UPPY_TUS_ENDPOINT,
        removeFingerprintOnSuccess: true,
        headers: {
          Authorization: "Bearer " + token,
          /* @ts-ignore */
          ["x-upsert"]: true,
        },
        allowedMetaFields: [
          "bucketName",
          "objectName",
          "contentType",
          "cacheControl",
        ],
      })
    );
  }, [token]);

  useEffect(() => {
    if (!uppy) return;

    const cb = (file: UppyFile<any>) => {
      file.meta = {
        ...file.meta,
        bucketName: UPPY_BUCKET,
        objectName: `${userId}/${`sheet_${new Date().toISOString()}_${uuidv4()}.pdf`}`,
        contentType: file.type,
      };
    };

    uppy.off("file-added", cb).on("file-added", cb);
  }, [uppy, userId]);

  return (
    <UppyContext.Provider value={{ uppy }}>{children}</UppyContext.Provider>
  );
};

export const useUppy = () => {
  const context = useContext(UppyContext);
  if (!context) {
    throw new Error("useUppyContext must be used within an UppyProvider");
  }

  return context;
};
