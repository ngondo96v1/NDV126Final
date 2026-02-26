
import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";
import cors from "cors";
import { createClient } from '@supabase/supabase-js';

// Supabase Setup
const getSupabaseClient = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    return null;
  }
  
  try {
    // Ensure URL is valid
    new URL(url);
    return createClient(url, key);
  } catch (e) {
    console.error("Invalid Supabase URL:", url);
    return null;
  }
};

let supabaseInstance = getSupabaseClient();

async function startServer() {
  const app = express();
  const PORT = 3000;

  console.log(`Starting server in ${process.env.NODE_ENV || 'development'} mode`);

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  // Health check
  app.get("/health", (req, res) => {
    res.send("OK");
  });

  // Supabase Status check for Frontend
  app.get("/api/supabase-status", async (req, res) => {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.json({ 
        connected: false, 
        error: "Thiếu biến môi trường SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY. Vui lòng cấu hình trong AI Studio." 
      });
    }

    if (!supabaseInstance) {
      supabaseInstance = getSupabaseClient();
    }

    if (!supabaseInstance) {
      return res.json({ connected: false, error: "URL Supabase không hợp lệ (phải bắt đầu bằng https://)" });
    }

    try {
      const { error } = await supabaseInstance.from('system_config').select('key').limit(1);
      if (error) throw error;
      res.json({ connected: true, error: null });
    } catch (err: any) {
      console.error("Supabase connection error:", err);
      res.json({ connected: false, error: err.message || 'Lỗi kết nối Supabase' });
    }
  });

  // API Routes
  app.get("/api/data", async (req, res) => {
    try {
      if (!supabaseInstance) supabaseInstance = getSupabaseClient();
      if (!supabaseInstance) throw new Error("Supabase client not initialized. Check your environment variables.");

      const { data: users, error: uErr } = await supabaseInstance.from('users').select('*');
      if (uErr) throw uErr;
      const { data: loans, error: lErr } = await supabaseInstance.from('loans').select('*');
      if (lErr) throw lErr;
      const { data: notifications, error: nErr } = await supabaseInstance.from('notifications').select('*');
      if (nErr) throw nErr;
      const { data: config, error: cErr } = await supabaseInstance.from('system_config').select('*');
      if (cErr) throw cErr;

      const budget = config?.find(c => c.key === 'budget')?.value || 30000000;
      const rankProfit = config?.find(c => c.key === 'rankProfit')?.value || 0;

      // Map snake_case to camelCase if necessary, or keep as is if frontend matches
      // The frontend seems to expect camelCase based on types.ts
      const mappedUsers = users?.map(u => ({
        ...u,
        fullName: u.full_name,
        idNumber: u.id_number,
        totalLimit: u.total_limit,
        rankProgress: u.rank_progress,
        isLoggedIn: u.is_logged_in,
        isAdmin: u.is_admin,
        pendingUpgradeRank: u.pending_upgrade_rank,
        rankUpgradeBill: u.rank_upgrade_bill,
        idFront: u.id_front,
        idBack: u.id_back,
        refZalo: u.ref_zalo,
        lastLoanSeq: u.last_loan_seq,
        bankName: u.bank_name,
        bankAccountNumber: u.bank_account_number,
        bankAccountHolder: u.bank_account_holder,
        updatedAt: Number(u.updated_at)
      }));

      const mappedLoans = loans?.map(l => ({
        ...l,
        userId: l.user_id,
        userName: l.user_name,
        createdAt: l.created_at,
        rejectionReason: l.rejection_reason,
        billImage: l.bill_image,
        updatedAt: Number(l.updated_at)
      }));

      const mappedNotifs = notifications?.map(n => ({
        ...n,
        userId: n.user_id
      }));

      res.json({
        users: mappedUsers || [],
        loans: mappedLoans || [],
        notifications: mappedNotifs || [],
        budget: Number(budget),
        rankProfit: Number(rankProfit)
      });
    } catch (e: any) {
      console.error("Lỗi trong /api/data:", e);
      res.status(500).json({ error: e.message || "Internal Server Error" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const incomingUsers = req.body;
      for (const u of incomingUsers) {
        const dbUser = {
          id: u.id,
          phone: u.phone,
          full_name: u.fullName,
          id_number: u.idNumber,
          balance: u.balance,
          total_limit: u.totalLimit,
          rank: u.rank,
          rank_progress: u.rankProgress,
          is_logged_in: u.isLoggedIn,
          is_admin: u.isAdmin,
          pending_upgrade_rank: u.pendingUpgradeRank,
          rank_upgrade_bill: u.rankUpgradeBill,
          address: u.address,
          join_date: u.joinDate,
          id_front: u.idFront,
          id_back: u.idBack,
          ref_zalo: u.refZalo,
          relationship: u.relationship,
          last_loan_seq: u.lastLoanSeq,
          bank_name: u.bankName,
          bank_account_number: u.bankAccountNumber,
          bank_account_holder: u.bankAccountHolder,
          updated_at: u.updatedAt || Date.now()
        };
        await supabaseInstance.from('users').upsert(dbUser);
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/loans", async (req, res) => {
    try {
      const incomingLoans = req.body;
      for (const l of incomingLoans) {
        const dbLoan = {
          id: l.id,
          user_id: l.userId,
          user_name: l.userName,
          amount: l.amount,
          date: l.date,
          created_at: l.createdAt,
          status: l.status,
          fine: l.fine,
          bill_image: l.billImage,
          signature: l.signature,
          rejection_reason: l.rejectionReason,
          updated_at: l.updatedAt || Date.now()
        };
        await supabaseInstance.from('loans').upsert(dbLoan);
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/notifications", async (req, res) => {
    try {
      const incomingNotifs = req.body;
      for (const n of incomingNotifs) {
        const dbNotif = {
          id: n.id,
          user_id: n.userId,
          title: n.title,
          message: n.message,
          time: n.time,
          read: n.read,
          type: n.type
        };
        await supabaseInstance.from('notifications').upsert(dbNotif);
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/budget", async (req, res) => {
    try {
      await supabaseInstance.from('system_config').upsert({ key: 'budget', value: req.body.budget });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/rankProfit", async (req, res) => {
    try {
      await supabaseInstance.from('system_config').upsert({ key: 'rankProfit', value: req.body.rankProfit });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      const userId = req.params.id;
      await supabaseInstance.from('users').delete().eq('id', userId);
      // Cascading delete should handle loans and notifications if set up in SQL
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Vite middleware for development
  const distPath = path.join(process.cwd(), "dist");
  const useVite = process.env.NODE_ENV !== "production" || !fs.existsSync(distPath);

  if (useVite) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
