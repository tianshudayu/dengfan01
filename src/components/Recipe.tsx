import React, { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';

interface RecipeProps {
  onNavigate: (view: string) => void;
}

export default function Recipe({ onNavigate }: RecipeProps) {
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [newIngredientName, setNewIngredientName] = useState('');
  const [newIngredientQuantity, setNewIngredientQuantity] = useState('');
  const [newIngredientAdded, setNewIngredientAdded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [recipeData, setRecipeData] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // 初次加载拉取数据
  useEffect(() => {
    fetchIngredients();
  }, []);

  const fetchIngredients = async () => {
    try {
      setIsLoading(true);
      const res = await apiFetch('/manage');
      if (res && res.data) {
        setIngredients(res.data.map((item: any) => ({
          ...item,
          checked: false,
          missing: false
        })));
      }
    } catch (e) {
      console.error("加载食材失败", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIngredientName) return;

    // 乐观更新 UI
    const optimisticId = Date.now();
    const newIngredient = {
      id: optimisticId,
      name: newIngredientName,
      quantity: newIngredientQuantity,
      checked: newIngredientAdded,
      missing: false,
    };

    setIngredients(prev => [newIngredient, ...prev]);
    setNewIngredientName('');
    setNewIngredientQuantity('');
    setNewIngredientAdded(false);

    try {
      // 提交到 D1 数据库
      await apiFetch('/manage', {
        method: 'POST',
        body: JSON.stringify({
          name: newIngredientName,
          quantity: newIngredientQuantity,
        })
      });
      // 静默重新拉取确保 ID 和状态与数据库同步
      fetchIngredients();
    } catch (error) {
      console.error("保存失败", error);
      // 回滚
      setIngredients(prev => prev.filter(i => i.id !== optimisticId));
    }
  };

  const toggleIngredient = (id: number) => {
    setIngredients(ingredients.map(ing =>
      ing.id === id ? { ...ing, checked: !ing.checked } : ing
    ));
  };

  const handleGenerateRecipe = async () => {
    try {
      setIsGenerating(true);
      const res = await apiFetch('/generate_recipe');
      if (res && res.success) {
        setRecipeData(res.recipe);
      }
    } catch (e) {
      console.error("生成菜谱失败", e);
      alert("生成失败，请确认是否添加了食材。");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background-dark relative">
      <header className="flex-none flex items-center justify-between px-4 py-4 border-b border-border-color bg-background-dark z-20">
        <button onClick={() => onNavigate('DASH')} className="w-10 h-10 flex items-center justify-center text-text-main hover:text-primary transition-colors rounded-sm active:bg-surface">
          <span className="material-symbols-outlined text-[24px]">arrow_back</span>
        </button>
        <h1 className="font-display font-bold text-lg tracking-tight uppercase">食谱 // 清单</h1>
        <div className="flex items-center gap-2">
          <button className="w-10 h-10 flex items-center justify-center text-text-main hover:text-primary transition-colors rounded-sm active:bg-surface">
            <span className="material-symbols-outlined text-[20px]">share</span>
          </button>
          <button className="w-10 h-10 flex items-center justify-center text-primary hover:text-text-main transition-colors rounded-sm active:bg-surface">
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>bookmark</span>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto scrollbar-hide relative bg-background-dark">
        <div className="relative w-full h-48 border-b border-border-color overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-transparent to-transparent z-10 opacity-80"></div>
          <img
            alt={recipeData ? recipeData.name : "Mapo Tofu"}
            className="w-full h-full object-cover opacity-60 grayscale group-hover:grayscale-0 transition-all duration-700"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCy5FqmOiNJZDoJmT4UOt2vthX4l-nDhsjBU2hCNN8wdvSRJFBdosGF0c_atbFpBb9HeVEqeglA9Va5uZnX6uuYnhV5BnUPE-a1X_gQYStBYBn4hWpU7IuK0S_dGiA3l7dvhiIzatc4C1GRZRR-22jQUfLLw0KlClFrojPtEYV5wvBCrYmiXriPDnA8BzIFT27J6tq1VQ5KZG7w9ezoXdhQSYUqDtM55W9Ui9ECh140oIduOvrfajyngVdafTY9fw3wn8aspJuF"
          />
          <div className="absolute bottom-4 left-4 z-20">
            {recipeData && recipeData.tags && (
              <div className="flex items-center gap-2 mb-1">
                {recipeData.tags.map((tag: string, i: number) => (
                  <span key={i} className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-sm uppercase ${i === 0 ? 'bg-primary text-background-dark' : 'bg-surface border border-border-color text-text-mute'}`}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <h2 className="font-display font-bold text-3xl tracking-tight leading-none text-text-main">
              {recipeData ? recipeData.name : '等待 AI 生成菜谱...'}
            </h2>
          </div>
        </div>

        <div className="sticky top-0 z-10 bg-background-dark/95 backdrop-blur-sm border-b border-border-color py-3 px-4 flex justify-between items-center">
          <div className="flex space-x-3 overflow-x-auto scrollbar-hide pb-1 flex-1">
            <button className="flex-shrink-0 bg-text-main text-background-dark px-4 py-2 rounded-sm border border-text-main transition-transform active:scale-95">
              <div className="flex flex-col items-start leading-none gap-1">
                <span className="font-display font-bold text-xs uppercase tracking-widest">时间</span>
                <span className="font-mono text-[10px] font-medium">{recipeData ? recipeData.time : '-- 分钟'}</span>
              </div>
            </button>
            <button className="flex-shrink-0 bg-transparent text-text-mute px-4 py-2 rounded-sm border border-border-color hover:border-primary/50 hover:text-primary transition-colors">
              <div className="flex flex-col items-start leading-none gap-1">
                <span className="font-display font-bold text-xs uppercase tracking-widest">健康</span>
                <span className="font-mono text-[10px] font-medium">{recipeData ? recipeData.calories + ' 千卡' : '-- 千卡'}</span>
              </div>
            </button>
          </div>
          <button
            onClick={handleGenerateRecipe}
            disabled={isGenerating || ingredients.length === 0}
            className="flex-shrink-0 ml-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 px-3 py-2 rounded-sm text-xs font-mono transition-colors disabled:opacity-50"
          >
            {isGenerating ? 'AI 生成中...' : 'AI 一键生成'}
          </button>
        </div>

        <div className="p-4 space-y-8 pb-24">
          <section>
            <div className="flex items-center justify-between mb-3 border-b border-border-color pb-1">
              <h3 className="font-mono text-xs text-text-mute uppercase tracking-widest">输入 // 材料</h3>
              <span className="font-mono text-xs text-primary">{isLoading ? '加载中...' : `${ingredients.length} 项`}</span>
            </div>
            <div className="grid grid-cols-1 border-t border-border-color">
              {ingredients.length === 0 && !isLoading && (
                <div className="py-4 text-center text-text-mute text-sm font-mono">暂无材料，请添加。</div>
              )}
              {ingredients.map((ing) => (
                <div key={ing.id} className={`grid grid-cols-12 gap-4 py-3 border-b border-dashed border-border-color items-center ${ing.missing ? 'opacity-50' : ''}`}>
                  <div className="col-span-1 text-text-mute flex justify-center">
                    {ing.missing ? (
                      <span className="material-symbols-outlined text-[16px] text-alert">error</span>
                    ) : (
                      <input
                        className="w-4 h-4 rounded-sm border-text-mute bg-transparent checked:bg-primary checked:border-primary focus:ring-0 focus:ring-offset-0 text-primary transition-colors cursor-pointer"
                        type="checkbox"
                        checked={ing.checked}
                        onChange={() => toggleIngredient(ing.id)}
                      />
                    )}
                  </div>
                  <div className={`col-span-7 font-body font-bold text-sm ${ing.missing ? 'text-text-mute line-through' : ''}`}>
                    {ing.name}
                  </div>
                  <div className={`col-span-4 text-right font-mono text-sm ${ing.missing ? 'text-text-mute' : 'text-primary'}`}>
                    {ing.quantity}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 border border-border-color bg-surface/30 rounded-sm">
              <h4 className="font-mono text-[10px] text-text-mute uppercase tracking-widest mb-2">添加新材料</h4>
              <form onSubmit={handleAddIngredient} className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="材料名称"
                    value={newIngredientName}
                    onChange={(e) => setNewIngredientName(e.target.value)}
                    className="flex-1 bg-background-dark border border-border-color rounded-sm px-2 py-1.5 text-sm text-text-main focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  />
                  <input
                    type="text"
                    placeholder="数量"
                    value={newIngredientQuantity}
                    onChange={(e) => setNewIngredientQuantity(e.target.value)}
                    className="w-24 bg-background-dark border border-border-color rounded-sm px-2 py-1.5 text-sm text-text-main focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newIngredientAdded}
                      onChange={(e) => setNewIngredientAdded(e.target.checked)}
                      className="w-4 h-4 rounded-sm border-text-mute bg-transparent checked:bg-primary checked:border-primary focus:ring-0 focus:ring-offset-0 text-primary transition-colors cursor-pointer"
                    />
                    <span className="text-xs text-text-mute">已加入清单</span>
                  </label>
                  <button
                    type="submit"
                    className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 px-3 py-1 rounded-sm text-xs font-mono transition-colors"
                  >
                    添加
                  </button>
                </div>
              </form>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-6 border-b border-border-color pb-1">
              <h3 className="font-mono text-xs text-text-mute uppercase tracking-widest">过程 // 执行</h3>
              <span className="font-mono text-xs text-primary">{recipeData?.steps?.length || 0} 步</span>
            </div>
            {recipeData ? (
              <div className="relative space-y-0 pl-2">
                <div className="absolute left-[19px] top-2 bottom-4 w-px bg-border-color"></div>
                {recipeData.steps.map((step: any, index: number) => (
                  <div key={index} className="relative pl-10 pb-8 group">
                    <div className="absolute left-0 top-0 w-10 flex justify-center bg-background-dark z-10 py-1">
                      <span className="font-mono text-primary font-bold text-lg">0{index + 1}</span>
                    </div>
                    <div className="pt-1.5">
                      <h4 className="font-display font-bold text-text-main text-base mb-1">{step.title}</h4>
                      <p className="text-gray-300 text-sm leading-relaxed mb-3">
                        {step.content}
                      </p>
                      {(step.timer || step.temp) && (
                        <div className="flex items-center gap-2">
                          {step.timer && (
                            <button className="flex items-center gap-2 bg-surface hover:bg-text-main/10 border border-primary/30 text-primary px-3 py-1.5 rounded-sm transition-colors group/btn">
                              <span className="material-symbols-outlined text-[16px] animate-pulse">timer</span>
                              <span className="font-mono text-xs font-bold">{step.timer}</span>
                            </button>
                          )}
                          {step.temp && <span className="text-xs text-text-mute font-mono">{step.temp}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-text-mute text-sm font-mono py-8">
                点击上方“AI 一键生成”根据可用库存生成菜谱。
              </div>
            )}
          </section>

          {recipeData && (
            <div className="mt-8 border border-border-color bg-surface/50 p-4 rounded-sm flex justify-between items-center">
              <div>
                <div className="text-xs text-text-mute font-mono mb-1">总时间</div>
                <div className="text-xl font-display font-bold text-text-main">{recipeData.time}</div>
              </div>
              <div>
                <div className="text-xs text-text-mute font-mono mb-1 text-right">卡路里</div>
                <div className="text-xl font-display font-bold text-text-main text-right">{recipeData.calories} <span className="text-xs font-normal text-text-mute">千卡</span></div>
              </div>
            </div>
          )}
        </div>
      </main>

      <div className="absolute bottom-6 right-6 z-30">
        <button onClick={() => onNavigate('TIMERS')} className="bg-primary hover:bg-[#00e082] text-background-dark h-14 w-14 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(0,255,148,0.3)] transition-all hover:scale-105 active:scale-95 group">
          <span className="material-symbols-outlined text-[28px] group-hover:animate-spin">play_arrow</span>
        </button>
      </div>
    </div>
  );
}
