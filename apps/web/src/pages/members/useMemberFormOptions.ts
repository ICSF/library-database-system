import { useEffect, useState } from 'react';
import { trpc } from '../../lib/TRPC';

type MemberOption = {
  id: number;
  name: string;
};

type MemberFormOptions = {
  memberTypes: MemberOption[];
  departments: MemberOption[];
};

let cachedOptions: MemberFormOptions | null = null;
let optionsRequest: Promise<MemberFormOptions> | null = null;

// Share options between forms and deduplicate simultaneous requests during
// navigation or when multiple member forms are mounted.
async function loadMemberFormOptions(): Promise<MemberFormOptions> {
  if (cachedOptions) {
    return cachedOptions;
  }

  if (!optionsRequest) {
    optionsRequest = trpc.memberFormOptions.query().then((options) => {
      cachedOptions = options;
      return options;
    }).finally(() => {
      optionsRequest = null;
    });
  }

  return optionsRequest;
}

export function invalidateMemberFormOptions() {
  // The next form mount will fetch fresh database-backed options.
  cachedOptions = null;
}

export function useMemberFormOptions() {
  const [memberTypeOptions, setMemberTypeOptions] = useState<MemberOption[]>([]);
  const [departmentOptions, setDepartmentOptions] = useState<MemberOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    async function loadOptions() {
      try {
        const options = await loadMemberFormOptions();
        if (isCurrent) {
          setMemberTypeOptions(options.memberTypes);
          setDepartmentOptions(options.departments);
        }
      } catch (loadError) {
        console.error('Failed to load member form options:', loadError);
        if (isCurrent) {
          setError(true);
        }
      } finally {
        if (isCurrent) {
          setLoading(false);
        }
      }
    }

    void loadOptions();

    return () => {
      isCurrent = false;
    };
  }, []);

  return { memberTypeOptions, departmentOptions, loading, error };
}
