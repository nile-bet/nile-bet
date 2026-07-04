path = "lib/actions/admin.ts"
with open(path) as f:
    content = f.read()

old = """      let slipsQuery = supabase
        .from('slips')
        .select('stake, net_payout, status, created_at')
        .in('placed_by', placerIds)

      if (startDate) slipsQuery = slipsQuery.gte('created_at', startDate)
      if (endDate) slipsQuery = slipsQuery.lte('created_at', endDate)

      const { data: agentSlips } = await slipsQuery
      const revenue = (agentSlips ?? [])
        .reduce(
          (a, s) => a + (s.stake ?? 0), 0
        )
      return {
        ...agent,
        cashiers_count: cashiersCount ?? 0,
        revenue,
        active_slips: (agentSlips ?? [])
          .filter((s) => s.status === 'pending')
          .length,
      }
    })
  )
  return results.sort(
    (a, b) => b.revenue - a.revenue
  )
}"""

new = """      let slipsQuery = supabase
        .from('slips')
        .select('stake, net_payout, status, created_at')
        .in('placed_by', placerIds)

      if (startDate) slipsQuery = slipsQuery.gte('created_at', startDate)
      if (endDate) slipsQuery = slipsQuery.lte('created_at', endDate)

      let jpQuery = supabase
        .from('jackpot_slips')
        .select('stake, reward_amount, status, created_at')
        .in('placed_by', placerIds)

      if (startDate) jpQuery = jpQuery.gte('created_at', startDate)
      if (endDate) jpQuery = jpQuery.lte('created_at', endDate)

      const { data: agentSlips } = await slipsQuery
      const { data: agentJpSlips } = await jpQuery

      const revenue = (agentSlips ?? [])
        .reduce((a, s) => a + (s.stake ?? 0), 0) +
        (agentJpSlips ?? [])
          .reduce((a, s) => a + (s.stake ?? 0), 0)

      const active_slips = (agentSlips ?? [])
        .filter((s) => s.status === 'pending').length +
        (agentJpSlips ?? [])
          .filter((s) => s.status === 'pending').length

      return {
        ...agent,
        cashiers_count: cashiersCount ?? 0,
        revenue,
        active_slips,
      }
    })
  )
  return results.sort(
    (a, b) => b.revenue - a.revenue
  )
}"""

if old not in content:
    print("NOT FOUND")
else:
    content = content.replace(old, new, 1)
    with open(path, "w") as f:
        f.write(content)
    print("FIX APPLIED")
python3 fix_agent_perf.py && rm fix_agent_perf.py
X
