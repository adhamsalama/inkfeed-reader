package main

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/adhamsalama/inkfeed-backend/db"
)

type preferencesRequest struct {
	FontSize        float64 `json:"fontSize"`
	LetterSpacing   float64 `json:"letterSpacing"`
	LineHeight      float64 `json:"lineHeight"`
	CorsProxyUrl    string  `json:"corsProxyUrl"`
	EpubEmbedImages bool    `json:"epubEmbedImages"`
	MobiEmbedImages bool    `json:"mobiEmbedImages"`
	EmailTo         string  `json:"emailTo"`
}

type savedFeedItem struct {
	URL            string `json:"url"`
	Title          string `json:"title"`
	ArchiveEnabled bool   `json:"archiveEnabled"`
}

type feedGroupItem struct {
	URL   string `json:"url"`
	Title string `json:"title"`
}

type feedGroupData struct {
	Name  string          `json:"name"`
	Feeds []feedGroupItem `json:"feeds"`
}

type favoriteItem struct {
	URL         string `json:"url"`
	Title       string `json:"title"`
	FeedTitle   string `json:"feedTitle"`
	PubDate     string `json:"pubDate"`
	CommentsUrl string `json:"commentsUrl"`
}

type preferencesResponse struct {
	Email           string          `json:"email"`
	FontSize        float64         `json:"fontSize"`
	LetterSpacing   float64         `json:"letterSpacing"`
	LineHeight      float64         `json:"lineHeight"`
	CorsProxyUrl    string          `json:"corsProxyUrl"`
	EpubEmbedImages bool            `json:"epubEmbedImages"`
	MobiEmbedImages bool            `json:"mobiEmbedImages"`
	EmailTo         string          `json:"emailTo"`
	SavedFeeds      []savedFeedItem `json:"savedFeeds"`
	FeedGroups      []feedGroupData `json:"feedGroups"`
	Favorites       []favoriteItem  `json:"favorites"`
}

func preferencesHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(contextKey("userID")).(int64)
	switch r.Method {
	case http.MethodGet:
		getPreferencesHandler(w, r, userID)
	case http.MethodPut:
		putPreferencesHandler(w, r, userID)
	default:
		jsonError(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func getPreferencesHandler(w http.ResponseWriter, r *http.Request, userID int64) {
	user, err := queries.GetUserByID(r.Context(), userID)
	if err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}

	prefs, err := queries.GetUserPreferences(r.Context(), userID)
	if err != nil && err != sql.ErrNoRows {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}

	feeds, err := queries.GetUserSavedFeeds(r.Context(), userID)
	if err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}

	feedItems := make([]savedFeedItem, len(feeds))
	for i, f := range feeds {
		feedItems[i] = savedFeedItem{URL: f.Url, Title: f.Title, ArchiveEnabled: f.ArchiveEnabled != 0}
	}

	groups, err := queries.GetUserFeedGroups(r.Context(), userID)
	if err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}

	groupDataList := make([]feedGroupData, 0, len(groups))
	for _, g := range groups {
		items, err := queries.GetFeedGroupItems(r.Context(), g.ID)
		if err != nil {
			jsonError(w, "internal error", http.StatusInternalServerError)
			return
		}
		feedGroupItems := make([]feedGroupItem, len(items))
		for j, item := range items {
			feedGroupItems[j] = feedGroupItem{URL: item.Url, Title: item.Title}
		}
		groupDataList = append(groupDataList, feedGroupData{Name: g.Name, Feeds: feedGroupItems})
	}

	favRows, err := queries.GetUserFavorites(r.Context(), userID)
	if err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	favItems := make([]favoriteItem, len(favRows))
	for i, f := range favRows {
		favItems[i] = favoriteItem{URL: f.Url, Title: f.Title, FeedTitle: f.FeedTitle, PubDate: f.PubDate, CommentsUrl: f.CommentsUrl}
	}

	resp := preferencesResponse{
		Email:      user.Email,
		SavedFeeds: feedItems,
		FeedGroups: groupDataList,
		Favorites:  favItems,
	}
	if prefs.FontSize.Valid {
		resp.FontSize = prefs.FontSize.Float64
	}
	if prefs.LetterSpacing.Valid {
		resp.LetterSpacing = prefs.LetterSpacing.Float64
	}
	if prefs.LineHeight.Valid {
		resp.LineHeight = prefs.LineHeight.Float64
	}
	if prefs.CorsProxyUrl.Valid {
		resp.CorsProxyUrl = prefs.CorsProxyUrl.String
	}
	if prefs.EpubEmbedImages.Valid {
		resp.EpubEmbedImages = prefs.EpubEmbedImages.Int64 != 0
	} else {
		resp.EpubEmbedImages = true
	}
	if prefs.MobiEmbedImages.Valid {
		resp.MobiEmbedImages = prefs.MobiEmbedImages.Int64 != 0
	} else {
		resp.MobiEmbedImages = true
	}
	if prefs.EmailTo.Valid {
		resp.EmailTo = prefs.EmailTo.String
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func putPreferencesHandler(w http.ResponseWriter, r *http.Request, userID int64) {
	var req preferencesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request", http.StatusBadRequest)
		return
	}

	epubEmbedInt := int64(0)
	if req.EpubEmbedImages {
		epubEmbedInt = 1
	}
	mobiEmbedInt := int64(0)
	if req.MobiEmbedImages {
		mobiEmbedInt = 1
	}

	err := queries.UpsertUserPreferences(r.Context(), db.UpsertUserPreferencesParams{
		UserID:          userID,
		FontSize:        sql.NullFloat64{Float64: req.FontSize, Valid: true},
		LetterSpacing:   sql.NullFloat64{Float64: req.LetterSpacing, Valid: true},
		LineHeight:      sql.NullFloat64{Float64: req.LineHeight, Valid: true},
		CorsProxyUrl:    sql.NullString{String: req.CorsProxyUrl, Valid: true},
		EpubEmbedImages: sql.NullInt64{Int64: epubEmbedInt, Valid: true},
		MobiEmbedImages: sql.NullInt64{Int64: mobiEmbedInt, Valid: true},
		EmailTo:         sql.NullString{String: req.EmailTo, Valid: true},
	})
	if err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func savedFeedsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		jsonError(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	userID := r.Context().Value(contextKey("userID")).(int64)

	var feeds []savedFeedItem
	if err := json.NewDecoder(r.Body).Decode(&feeds); err != nil {
		jsonError(w, "invalid request", http.StatusBadRequest)
		return
	}

	if err := queries.DeleteUserSavedFeeds(r.Context(), userID); err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}

	for i, f := range feeds {
		archiveEnabled := int64(0)
		if f.ArchiveEnabled {
			archiveEnabled = 1
		}
		err := queries.InsertUserSavedFeed(r.Context(), db.InsertUserSavedFeedParams{
			UserID:         userID,
			Url:            f.URL,
			Title:          f.Title,
			Position:       int64(i),
			ArchiveEnabled: archiveEnabled,
		})
		if err != nil {
			jsonError(w, "internal error", http.StatusInternalServerError)
			return
		}
	}

	w.WriteHeader(http.StatusNoContent)
}

func feedGroupsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		jsonError(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	userID := r.Context().Value(contextKey("userID")).(int64)

	var groups []feedGroupData
	if err := json.NewDecoder(r.Body).Decode(&groups); err != nil {
		jsonError(w, "invalid request", http.StatusBadRequest)
		return
	}

	if err := queries.DeleteUserFeedGroupItems(r.Context(), userID); err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	if err := queries.DeleteUserFeedGroups(r.Context(), userID); err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}

	for i, g := range groups {
		groupID, err := queries.InsertFeedGroup(r.Context(), db.InsertFeedGroupParams{
			UserID:   userID,
			Name:     g.Name,
			Position: int64(i),
		})
		if err != nil {
			jsonError(w, "internal error", http.StatusInternalServerError)
			return
		}
		for j, item := range g.Feeds {
			err := queries.InsertFeedGroupItem(r.Context(), db.InsertFeedGroupItemParams{
				GroupID:  groupID,
				Url:      item.URL,
				Title:    item.Title,
				Position: int64(j),
			})
			if err != nil {
				jsonError(w, "internal error", http.StatusInternalServerError)
				return
			}
		}
	}

	w.WriteHeader(http.StatusNoContent)
}

func favoritesHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		jsonError(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	userID := r.Context().Value(contextKey("userID")).(int64)

	var favs []favoriteItem
	if err := json.NewDecoder(r.Body).Decode(&favs); err != nil {
		jsonError(w, "invalid request", http.StatusBadRequest)
		return
	}

	if err := queries.DeleteAllUserFavorites(r.Context(), userID); err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}

	for _, f := range favs {
		err := queries.InsertUserFavorite(r.Context(), db.InsertUserFavoriteParams{
			UserID:      userID,
			Url:         f.URL,
			Title:       f.Title,
			FeedTitle:   f.FeedTitle,
			PubDate:     f.PubDate,
			CommentsUrl: f.CommentsUrl,
		})
		if err != nil {
			jsonError(w, "internal error", http.StatusInternalServerError)
			return
		}
	}

	w.WriteHeader(http.StatusNoContent)
}

func signoutHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		jsonError(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	cookie, err := r.Cookie("session")
	if err == nil {
		queries.DeleteSession(r.Context(), cookie.Value)
	}

	secure := strings.HasPrefix(allowedOrigins[0], "https://")
	http.SetCookie(w, &http.Cookie{
		Name:     "session",
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteStrictMode,
		MaxAge:   -1,
	})
	w.WriteHeader(http.StatusNoContent)
}
